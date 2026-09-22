import { FieldValue, getDb } from "./db.js";

const MAX_THREADS = 25;
const MAX_MESSAGES_PER_THREAD = 60;
// Leave ample room below Firestore's 1 MiB document limit for field/index
// metadata rather than discovering an oversize history only after a user has
// paid for a long research session.
const MAX_HISTORY_BYTES = 450_000;
const MAX_MESSAGE_CHARS = 18_000;
const MAX_ANSWER_CHARS = 48_000;

export interface StoredHistory {
  threads: Record<string, unknown>[];
  activeThreadId: string | null;
  updatedAt?: string;
  deliveries?: Record<string, unknown>[];
}

// A chat-vault id is generated with crypto.randomUUID() in the browser. It is
// deliberately separate from a wallet address: a wallet address is public,
// while this high-entropy id is the private bearer key for chat recovery.
export function isValidChatVaultId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function text(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, limit);
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function compactReceipts(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const receipts = value.slice(0, 8).flatMap((item) => {
    const receipt = object(item);
    if (!receipt) return [];
    const source = text(receipt.source, 160);
    if (!source) return [];
    // Do not persist a source's raw response body in chat history. We retain
    // the settlement evidence, but not licensed/paywalled source material.
    return [{
      source,
      amountPaid: text(receipt.amountPaid, 48),
      txHash: text(receipt.txHash, 160),
      basescanUrl: text(receipt.basescanUrl, 512),
      timestamp: text(receipt.timestamp, 96),
      settlement: text(receipt.settlement, 32),
    }];
  });
  return receipts.length ? receipts : undefined;
}

function compactCitations(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const citations = value.slice(0, 12).flatMap((item) => {
    const citation = object(item);
    const name = citation && text(citation.name, 160);
    const quote = citation && text(citation.citation, 4_000);
    return name && quote ? [{ name, citation: quote }] : [];
  });
  return citations.length ? citations : undefined;
}

function compactMessage(value: unknown): Record<string, unknown> | null {
  const message = object(value);
  if (!message || (message.role !== "user" && message.role !== "assistant")) return null;
  const content = text(message.content, MAX_MESSAGE_CHARS);
  if (!content) return null;

  const receipt = object(message.receipt);
  const persona = object(message.personaInsights);
  return {
    id: text(message.id, 96),
    role: message.role,
    content,
    time: text(message.time, 64),
    latencySec: text(message.latencySec, 32),
    completedAtUtc: text(message.completedAtUtc, 64),
    latestSourceRecency: text(message.latestSourceRecency, 64),
    receipt: receipt ? {
      paid: text(receipt.paid, 64),
      to: text(receipt.to, 320),
      via: text(receipt.via, 120),
      txId: text(receipt.txId, 160),
      basescanUrl: text(receipt.basescanUrl, 512),
      success: receipt.success === true,
      registryTxHash: text(receipt.registryTxHash, 160),
      registryContract: text(receipt.registryContract, 160),
      chainId: number(receipt.chainId),
      sourceCitations: compactCitations(receipt.sourceCitations),
    } : undefined,
    rawReceipts: compactReceipts(message.rawReceipts),
    sourceCitations: compactCitations(message.sourceCitations),
    topic: text(message.topic, 320),
    summary: text(message.summary, 12_000),
    personaInsights: persona ? {
      developer: text(persona.developer, 4_000),
      founder: text(persona.founder, 4_000),
      contentWriter: text(persona.contentWriter, 4_000),
      trader: text(persona.trader, 4_000),
    } : undefined,
    question: text(message.question, 600),
    deliveryId: text(message.deliveryId, 96),
    costDebited: number(message.costDebited),
    remainingBalance: number(message.remainingBalance),
  };
}

function compactThread(value: unknown): Record<string, unknown> | null {
  const thread = object(value);
  const id = thread && text(thread.id, 96);
  if (!thread || !id) return null;
  const messages = Array.isArray(thread.messages)
    ? thread.messages.slice(-MAX_MESSAGES_PER_THREAD).flatMap((message) => {
      const compact = compactMessage(message);
      return compact ? [compact] : [];
    })
    : [];

  return {
    id,
    title: text(thread.title, 320) || "New Research",
    topic: text(thread.topic, 320),
    preview: text(thread.preview, 1_000) || "",
    timeLabel: text(thread.timeLabel, 80) || "",
    dateLabel: text(thread.dateLabel, 80),
    costTotal: number(thread.costTotal),
    network: text(thread.network, 120),
    messages,
  };
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function fitHistory(history: StoredHistory): StoredHistory {
  const threads = history.threads.map((thread) => ({ ...thread }));
  while (threads.length > 1 && byteLength({ threads, activeThreadId: history.activeThreadId }) > MAX_HISTORY_BYTES) {
    const oldest = threads[threads.length - 1];
    const messages = Array.isArray(oldest.messages) ? oldest.messages : [];
    if (messages.length > 1) {
      oldest.messages = messages.slice(1);
    } else {
      threads.pop();
    }
  }
  return { threads, activeThreadId: history.activeThreadId };
}

export function sanitizeHistory(input: unknown): StoredHistory {
  const body = object(input);
  const rawThreads = body && Array.isArray(body.threads) ? body.threads : [];
  const threads = rawThreads.slice(0, MAX_THREADS).flatMap((thread) => {
    const compact = compactThread(thread);
    return compact ? [compact] : [];
  });
  const activeThreadId = body && text(body.activeThreadId, 96);
  return fitHistory({ threads, activeThreadId: activeThreadId || null });
}

export async function getChatHistory(vaultId: string): Promise<StoredHistory | null> {
  const vault = getDb().collection("chatVaults").doc(vaultId);
  const doc = await vault.get();
  const deliveryDocs = await vault.collection("deliveries").get();
  const deliveries: Record<string, unknown>[] = deliveryDocs.docs
    .map((delivery): Record<string, unknown> => ({ deliveryId: delivery.id, ...(delivery.data() ?? {}) }))
    .sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 50);
  if (!doc.exists) {
    return deliveries.length ? { threads: [], activeThreadId: null, deliveries } : null;
  }
  const data = doc.data()!;
  const history = sanitizeHistory({ threads: data.threads, activeThreadId: data.activeThreadId });
  return {
    ...history,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : undefined,
    deliveries,
  };
}

export async function saveChatHistory(vaultId: string, input: unknown): Promise<StoredHistory> {
  const history = sanitizeHistory(input);
  await getDb().collection("chatVaults").doc(vaultId).set({
    threads: history.threads,
    activeThreadId: history.activeThreadId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return history;
}

// This is the server-side delivery checkpoint for a paid request. It is
// written before /v1/answer emits its terminal success event, so a browser
// crash after payment cannot make a completed answer disappear.
export async function archivePaidDelivery(vaultId: string | null, answer: Record<string, unknown>): Promise<string | null> {
  if (!vaultId) return null;
  const deliveryId = crypto.randomUUID();
  const receipt = compactReceipts(answer.receipt);
  await getDb().collection("chatVaults").doc(vaultId).collection("deliveries").doc(deliveryId).set({
    deliveryId,
    question: text(answer.question, 600),
    topic: text(answer.topic, 320),
    summary: text(answer.summary, 12_000),
    answer: text(answer.answer, MAX_ANSWER_CHARS),
    personaInsights: object(answer.personaInsights) ? {
      developer: text(object(answer.personaInsights)!.developer, 4_000),
      founder: text(object(answer.personaInsights)!.founder, 4_000),
      contentWriter: text(object(answer.personaInsights)!.contentWriter, 4_000),
      trader: text(object(answer.personaInsights)!.trader, 4_000),
    } : undefined,
    sourceCitations: compactCitations(answer.sourceCitations),
    receipt,
    totalPaid: text(answer.totalPaid, 64),
    network: text(answer.network, 120),
    chainId: number(answer.chainId),
    createdAt: FieldValue.serverTimestamp(),
  });
  return deliveryId;
}
