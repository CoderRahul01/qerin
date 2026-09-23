import { isAddress, recoverMessageAddress } from "viem";

export function accountAccessMessage(accountId: string, expiresAt: string): string {
  return `Qerin account access\nDomain:qerin.vercel.app\nAccount:${accountId.toLowerCase()}\nExpires:${expiresAt}`;
}

/** A gasless wallet signature protects spending a public wallet's Qerin credit. */
export async function verifyAccountProof(accountId: string, rawProof: string | undefined): Promise<boolean> {
  if (!isAddress(accountId) || !rawProof || rawProof.length > 1024) return false;
  try {
    const proof = JSON.parse(rawProof) as { expiresAt?: string; signature?: string };
    if (typeof proof.expiresAt !== "string" || typeof proof.signature !== "string") return false;
    const expiry = Date.parse(proof.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 24 * 60 * 60 * 1000) return false;
    const signer = await recoverMessageAddress({
      message: accountAccessMessage(accountId, proof.expiresAt),
      signature: proof.signature as `0x${string}`,
    });
    return signer.toLowerCase() === accountId.toLowerCase();
  } catch {
    return false;
  }
}
