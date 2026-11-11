import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Default Treasury Address
const TREASURY_WALLET = new PublicKey(
  process.env.QERIN_SOLANA_TREASURY_ADDRESS ||
    "FQ42dDLP7p5DuDDisozkt6ZZP6FKgXh9UfWwFtt8FhDx"
);

// USDC Mint on Solana Mainnet & Devnet
const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "";

  const payload: ActionGetResponse = {
    icon: "https://qerin.vercel.app/qerin-app-icon-1024.png",
    title: "Qerin: Autonomous Intelligence Agent",
    description:
      "Autonomous agent utilizing x402 onchain micropayments on Solana to query live paywalled sources and generate cryptographically verified dossiers.",
    label: "Run Research ($0.05 USDC)",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Run Research ($0.05 USDC)",
          href: "/api/actions/research?query={query}",
          parameters: [
            {
              name: "query",
              label: "Enter token, contract address, or topic to research",
              required: true,
            },
          ],
        },
        {
          type: "transaction",
          label: "Audit Token Security ($0.05 USDC)",
          href: "/api/actions/research?query=Audit+Token+Security&type=audit",
        },
      ],
    },
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "General Web3 Intel";
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid 'account' provided" }), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const rpcUrl =
      process.env.QERIN_SOLANA_RPC_URL ||
      process.env.SOLANA_RPC_URL ||
      clusterApiUrl("mainnet-beta");

    const isDevnet = rpcUrl.includes("devnet");
    const usdcMint = isDevnet ? USDC_MINT_DEVNET : USDC_MINT_MAINNET;

    const connection = new Connection(rpcUrl, "confirmed");

    const userAta = await getAssociatedTokenAddress(usdcMint, account);
    const treasuryAta = await getAssociatedTokenAddress(usdcMint, TREASURY_WALLET);

    const transaction = new Transaction();

    // Check if user has a USDC token account
    const userAtaInfo = await connection.getAccountInfo(userAta);

    if (userAtaInfo) {
      // 0.05 USDC = 50,000 atomic units (6 decimals)
      const transferIx = createTransferInstruction(
        userAta,
        treasuryAta,
        account,
        50000
      );
      transaction.add(transferIx);
    } else {
      // Fallback: If user has no USDC ATA, accept a micro-payment of 0.00025 SOL (~$0.05)
      const solTransferIx = SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: TREASURY_WALLET,
        lamports: 250000, // 0.00025 SOL
      });
      transaction.add(solTransferIx);
    }

    transaction.feePayer = account;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Qerin agent triggered for "${query.slice(0, 40)}...". Settling x402 micro-payment on Solana.`,
      },
    });

    return Response.json(response, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create action transaction" }),
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }
}
