import { fetchBackend } from "@/lib/backendClient";

export async function GET(req: Request) {
  const { search, searchParams } = new URL(req.url);
  const targetNetwork = searchParams.get("network");

  try {
    const res = await fetchBackend(`/v1/network-info${search}`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    // Static fallback for Base (8453) and BOT Chain (677)
    const isBotChain = targetNetwork === "botchain";
    return Response.json(
      {
        name: isBotChain ? "BOT Chain Mainnet" : "Base Mainnet",
        payTo: "0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2",
        chainId: isBotChain ? "677" : "8453",
        usdc: isBotChain ? null : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        usdt: isBotChain ? "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C" : null,
        wbot: isBotChain ? "0xD5452816194a3784dBa983426cCe7c122F4abd30" : null,
        currency: isBotChain ? "BOT" : "USDC",
        rpcUrl: isBotChain ? "https://rpc.botchain.ai" : "https://mainnet.base.org",
        botPrice: 12.20,
        offline: true,
      },
      { status: 200 }
    );
  }
}
