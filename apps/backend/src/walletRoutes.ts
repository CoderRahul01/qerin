import type { Context, Hono } from "hono";
import { isAddress } from "viem";
import { verifyAccountProof } from "./accountProof.js";
import { getBalance, normalizeAccountId } from "./accounts.js";
import { agentWalletsEnabled } from "./agentWallet.js";
import { getAgentState, POLICY_BOUNDS, QERIN_SERVICE_FEE_USD, saveAgentPolicy, validatePolicyInput } from "./agentPolicy.js";
import { createOwnerIntent, redeemOwnerIntent } from "./ownerIntents.js";
import { executeWithdrawal, listQerinWallets, validateWithdrawDestination } from "./qerinWallet.js";
import { getRail, getWalletEnv } from "./rails.js";

// The Qerin Wallet API: everything a user needs to run their own agent
// treasury — see their wallet on every rail, fund it, set the agent's spend
// policy, and withdraw. Every route is internal-secret gated (only Qerin's
// frontend reaches it). Reads need only the account id; anything that
// creates wallets or moves funds needs the owner's wallet signature.

type Guard = (c: { req: { header: (name: string) => string | undefined } }) => boolean;

const MIN_WITHDRAW_USD = 0.01;

function ownerAccount(c: Context): string | null {
  const accountId = c.req.header("x-qerin-account-id");
  return accountId && isAddress(accountId) ? normalizeAccountId(accountId) : null;
}

async function hasAccessProof(c: Context, account: string): Promise<boolean> {
  return verifyAccountProof(account, c.req.header("x-qerin-account-proof"));
}

async function walletView(account: string, provision: boolean, fresh = false) {
  const [wallets, state, legacyCredit] = await Promise.all([
    listQerinWallets(account, provision, fresh),
    getAgentState(account),
    getBalance(account).catch(() => null),
  ]);
  const totalUsdc = wallets.reduce((sum, w) => sum + (w.usdc ?? 0), 0);
  return {
    account,
    enabled: agentWalletsEnabled(),
    env: getWalletEnv(),
    wallets,
    totalUsdc,
    legacyCredit: legacyCredit ?? 0,
    policy: state.policy,
    policyBounds: POLICY_BOUNDS,
    spentTodayUsd: state.spentTodayUsd,
    feeOwedUsd: state.feeOwedUsd,
    serviceFeeUsd: QERIN_SERVICE_FEE_USD,
    activity: state.activity,
  };
}

export function registerWalletRoutes(app: Hono<any>, requireInternalSecret: Guard): void {
  app.get("/v1/wallet", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet to open your Qerin wallet" }, 400);
    try {
      return c.json(await walletView(account, false, c.req.query("fresh") === "1"));
    } catch (err) {
      console.error("Could not load Qerin wallet:", err);
      return c.json({ error: "Your Qerin wallet is temporarily unavailable" }, 503);
    }
  });

  // Creates the user's wallet on every rail. Gated by the owner's access
  // signature so nobody can mint CDP wallets for addresses they don't hold.
  app.post("/v1/wallet/provision", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet to open your Qerin wallet" }, 400);
    if (!agentWalletsEnabled()) return c.json({ error: "Qerin wallets aren't enabled on this deployment" }, 503);
    if (!(await hasAccessProof(c, account))) return c.json({ error: "Sign in with this wallet to create your Qerin wallet" }, 401);
    try {
      return c.json(await walletView(account, true, true));
    } catch (err) {
      console.error("Could not provision Qerin wallet:", err);
      return c.json({ error: "Your Qerin wallet couldn't be created right now. Try again shortly." }, 503);
    }
  });

  app.post("/v1/wallet/policy/prepare", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet first" }, 400);
    if (!(await hasAccessProof(c, account))) return c.json({ error: "Sign in with this wallet first" }, 401);
    const policy = validatePolicyInput(await c.req.json().catch(() => null));
    if (typeof policy === "string") return c.json({ error: policy }, 400);
    const intent = await createOwnerIntent(account, "policy", { ...policy }, [
      ["Per-question limit (USDC)", policy.perQueryUsd.toFixed(2)],
      ["Daily limit (USDC)", policy.dailyUsd.toFixed(2)],
      ["Agent", policy.paused ? "paused" : "active"],
    ]);
    return c.json(intent);
  });

  app.post("/v1/wallet/policy/confirm", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet first" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const intent = await redeemOwnerIntent(account, "policy", body?.nonce, body?.signature);
    if (typeof intent === "string") return c.json({ error: intent }, 400);
    // Re-validate what was stored: the intent is trusted, but bounds may
    // have tightened between prepare and confirm.
    const policy = validatePolicyInput(intent.params);
    if (typeof policy === "string") return c.json({ error: policy }, 400);
    await saveAgentPolicy(account, policy);
    return c.json(await walletView(account, false));
  });

  app.post("/v1/wallet/withdraw/prepare", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet first" }, 400);
    if (!(await hasAccessProof(c, account))) return c.json({ error: "Sign in with this wallet first" }, 401);
    const body = await c.req.json().catch(() => ({}));
    const rail = typeof body?.rail === "string" ? getRail(body.rail) : null;
    if (!rail) return c.json({ error: "Choose which chain to withdraw from" }, 400);
    const amount = Math.floor(Number(body?.amountUsd) * 1e6) / 1e6;
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_USD) {
      return c.json({ error: `Withdraw at least $${MIN_WITHDRAW_USD.toFixed(2)} USDC` }, 400);
    }
    const destination = rail.family === "evm" ? account : String(body?.destination ?? "").trim();
    const destinationError = validateWithdrawDestination(rail, account, destination);
    if (destinationError) return c.json({ error: destinationError }, 400);

    const intent = await createOwnerIntent(account, "withdraw", { rail: rail.id, amountUsd: amount, destination }, [
      ["Chain", rail.name],
      ["Amount (USDC)", amount.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")],
      ["To", destination],
    ]);
    return c.json(intent);
  });

  app.post("/v1/wallet/withdraw/confirm", async (c) => {
    if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
    const account = ownerAccount(c);
    if (!account) return c.json({ error: "Connect a wallet first" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const intent = await redeemOwnerIntent(account, "withdraw", body?.nonce, body?.signature);
    if (typeof intent === "string") return c.json({ error: intent }, 400);

    const rail = getRail(String(intent.params.rail));
    const amount = Number(intent.params.amountUsd);
    const destination = String(intent.params.destination);
    if (!rail || !(amount > 0) || validateWithdrawDestination(rail, account, destination)) {
      return c.json({ error: "This withdrawal request is no longer valid" }, 400);
    }
    try {
      const outcome = await executeWithdrawal(account, rail, destination, amount);
      if (!outcome.ok) return c.json({ error: outcome.error }, 400);
      return c.json({ txHash: outcome.result.txHash, explorerUrl: outcome.explorerUrl, wallet: await walletView(account, false, true) });
    } catch (err) {
      console.error("Withdrawal failed:", err);
      // A facilitator timeout is indeterminate — the transfer may still land —
      // so never tell the user nothing moved.
      return c.json({ error: "The withdrawal didn't confirm. Check your wallet balance before trying again." }, 502);
    }
  });
}
