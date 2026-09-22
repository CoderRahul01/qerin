const CHAT_VAULT_STORAGE_KEY = "qerin_chat_vault_id_v1";

export interface RemoteChatHistory {
  threads: unknown[];
  activeThreadId: string | null;
  updatedAt?: string;
  deliveries?: unknown[];
}

export function getOrCreateChatVaultId(): string {
  if (typeof window === "undefined") {
    throw new Error("Chat history can only be accessed in the browser");
  }

  const existing = window.localStorage.getItem(CHAT_VAULT_STORAGE_KEY);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

  const vaultId = crypto.randomUUID();
  window.localStorage.setItem(CHAT_VAULT_STORAGE_KEY, vaultId);
  return vaultId;
}

export async function loadChatHistory(vaultId: string): Promise<RemoteChatHistory | null> {
  const res = await fetch("/api/history", {
    headers: { "X-Qerin-Chat-Vault-Id": vaultId },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Could not load chat history");
  return json?.history ?? null;
}

export async function saveChatHistory(vaultId: string, history: RemoteChatHistory): Promise<void> {
  const res = await fetch("/api/history", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Qerin-Chat-Vault-Id": vaultId,
    },
    body: JSON.stringify(history),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || "Could not save chat history");
  }
}
