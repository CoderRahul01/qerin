import { isAddress as isSolanaAddress } from "@solana/kit";
import { generateCdpJwt } from "./cdpAuth.js";
import { generateWalletAuthJwt } from "./agentWallet.js";
import { getRails, getWalletEnv, type RailId, type WalletEnv } from "./rails.js";
import { getTreasuryAddress } from "./qerinWallet.js";

// Operator check for Qerin wallets: is every value they need present and
// usable? Each check exercises the same local parsing/signing code the Worker
// uses in production, so "valid" means "would work", not just "non-empty".
// The report is booleans only — no value, prefix or length ever leaves here.

export interface ValueCheck {
  set: boolean;
  valid: boolean;
}

export interface WalletConfigReport {
  walletEnv: WalletEnv;
  values: Record<
    | "CDP_API_KEY_ID"
    | "CDP_API_KEY_SECRET"
    | "CDP_WALLET_SECRET"
    | "QERIN_TREASURY_ADDRESS"
    | "QERIN_SOLANA_TREASURY_ADDRESS"
    | "QERIN_INTERNAL_SECRET"
    | "FIREBASE_SERVICE_ACCOUNT",
    ValueCheck
  >;
  rails: { id: RailId; name: string; caip2: string; testnet: boolean; hasTreasury: boolean }[];
  /** True when every value is valid and every enabled rail has a treasury. */
  ready: boolean;
}

function present(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

async function signs(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

function isServiceAccount(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const sa = JSON.parse(raw) as Record<string, unknown>;
    return ["project_id", "client_email", "private_key"].every((k) => typeof sa[k] === "string" && sa[k] !== "");
  } catch {
    return false;
  }
}

export async function getWalletConfigReport(): Promise<WalletConfigReport> {
  const apiKeyId = process.env.CDP_API_KEY_ID ?? "";
  const apiKeySecret = process.env.CDP_API_KEY_SECRET ?? "";
  const walletSecret = process.env.CDP_WALLET_SECRET ?? "";
  const rails = getRails();
  const base = rails.find((r) => r.id === "base");

  const values: WalletConfigReport["values"] = {
    CDP_API_KEY_ID: { set: present("CDP_API_KEY_ID"), valid: present("CDP_API_KEY_ID") },
    CDP_API_KEY_SECRET: {
      set: present("CDP_API_KEY_SECRET"),
      valid:
        present("CDP_API_KEY_SECRET") &&
        (await signs(() =>
          generateCdpJwt({ apiKeyId: apiKeyId || "check", apiKeySecret, requestMethod: "GET", requestHost: "api.cdp.coinbase.com", requestPath: "/" })
        )),
    },
    CDP_WALLET_SECRET: {
      set: present("CDP_WALLET_SECRET"),
      valid: present("CDP_WALLET_SECRET") && (await signs(() => generateWalletAuthJwt(walletSecret, "POST", "/check"))),
    },
    QERIN_TREASURY_ADDRESS: {
      set: present("QERIN_TREASURY_ADDRESS"),
      valid: Boolean(base && getTreasuryAddress(base)),
    },
    QERIN_SOLANA_TREASURY_ADDRESS: {
      set: present("QERIN_SOLANA_TREASURY_ADDRESS"),
      // Checked even when the Solana rail is switched off.
      valid: isSolanaAddress(process.env.QERIN_SOLANA_TREASURY_ADDRESS ?? ""),
    },
    QERIN_INTERNAL_SECRET: { set: present("QERIN_INTERNAL_SECRET"), valid: present("QERIN_INTERNAL_SECRET") },
    FIREBASE_SERVICE_ACCOUNT: {
      set: present("FIREBASE_SERVICE_ACCOUNT"),
      valid: isServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT),
    },
  };

  const railReport = rails.map((r) => ({
    id: r.id,
    name: r.name,
    caip2: r.caip2,
    testnet: r.testnet,
    hasTreasury: getTreasuryAddress(r) !== null,
  }));

  return {
    walletEnv: getWalletEnv(),
    values,
    rails: railReport,
    ready: Object.values(values).every((v) => v.valid) && railReport.every((r) => r.hasTreasury),
  };
}
