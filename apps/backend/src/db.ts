import { importPKCS8, SignJWT } from "jose";

// ── Types ───────────────────────────────────────────────────────────────────

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface DocumentSnapshot<T = Record<string, any>> {
  id: string;
  exists: boolean;
  data(): T | undefined;
}

export interface QuerySnapshot<T = Record<string, any>> {
  docs: DocumentSnapshot<T>[];
  empty: boolean;
  size: number;
}

export interface DocumentReference {
  id: string;
  path: string; // e.g. "accounts/123" or "accounts/123/deposits/0xabc"
  get(): Promise<DocumentSnapshot>;
  set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void>;
  update(data: Record<string, any>): Promise<void>;
  delete(): Promise<void>;
  collection(subName: string): CollectionReference;
}

export interface CollectionReference {
  id: string;
  path: string;
  doc(id: string): DocumentReference;
  add(data: Record<string, any>): Promise<DocumentReference>;
  where(field: string, op: string, value: any): QueryReference;
  get(): Promise<QuerySnapshot>;
}

export interface QueryReference {
  where(field: string, op: string, value: any): QueryReference;
  get(): Promise<QuerySnapshot>;
}

export interface Transaction {
  get(ref: DocumentReference): Promise<DocumentSnapshot>;
  set(ref: DocumentReference, data: Record<string, any>, options?: { merge?: boolean }): void;
  update(ref: DocumentReference, data: Record<string, any>): void;
  delete(ref: DocumentReference): void;
}

// ── Value Marshaling ────────────────────────────────────────────────────────

const SERVER_TIMESTAMP_SENTINEL = "__QERIN_SERVER_TIMESTAMP__";

export const FieldValue = {
  serverTimestamp: () => SERVER_TIMESTAMP_SENTINEL,
};

export class Timestamp {
  constructor(public readonly date: Date) {}
  static fromDate(date: Date): Timestamp {
    return new Timestamp(date);
  }
  toISOString(): string {
    return this.date.toISOString();
  }
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (val === SERVER_TIMESTAMP_SENTINEL) {
    return { timestampValue: new Date().toISOString() };
  }
  if (val instanceof Timestamp) {
    return { timestampValue: val.toISOString() };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(field: any): any {
  if (!field || typeof field !== "object") return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return parseInt(field.integerValue, 10);
  if ("doubleValue" in field) return parseFloat(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("nullValue" in field) return null;
  if ("timestampValue" in field) return new Date(field.timestampValue);
  if ("mapValue" in field) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  if ("arrayValue" in field) {
    return (field.arrayValue.values || []).map(fromFirestoreValue);
  }
  return undefined;
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function fromFirestoreFields(fields?: Record<string, any>): Record<string, any> {
  if (!fields) return {};
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = fromFirestoreValue(v);
  }
  return res;
}

// ── Client & Token Management ───────────────────────────────────────────────

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) {
    return cachedToken.token;
  }
  const pk = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain Google OAuth access token: ${res.status} ${errText}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

export class FirestoreClient {
  private sa: ServiceAccount;
  private urlBase: string;
  private rootDocPath: string;

  constructor(sa: ServiceAccount) {
    this.sa = sa;
    this.urlBase = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
    this.rootDocPath = `projects/${sa.project_id}/databases/(default)/documents`;
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const token = await getAccessToken(this.sa);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    return fetch(url, { ...init, headers });
  }

  collection(collectionName: string): CollectionReference {
    return this.createCollectionRef(collectionName);
  }

  private createCollectionRef(collPath: string): CollectionReference {
    const client = this;
    return {
      id: collPath.split("/").pop()!,
      path: collPath,
      doc(id: string): DocumentReference {
        return client.createDocumentRef(`${collPath}/${id}`);
      },
      async add(data: Record<string, any>): Promise<DocumentReference> {
        const url = `${client.urlBase}/${collPath}`;
        const res = await client.fetch(url, {
          method: "POST",
          body: JSON.stringify({ fields: toFirestoreFields(data) }),
        });
        if (!res.ok) {
          throw new Error(`Failed to add doc to ${collPath}: ${res.status} ${await res.text()}`);
        }
        const docJson = (await res.json()) as { name: string };
        const id = docJson.name.split("/").pop()!;
        return client.createDocumentRef(`${collPath}/${id}`);
      },
      where(field: string, op: string, value: any): QueryReference {
        return client.createQueryRef(collPath, [{ field, op, value }]);
      },
      async get(): Promise<QuerySnapshot> {
        return client.createQueryRef(collPath, []).get();
      },
    };
  }

  private createDocumentRef(docPath: string): DocumentReference {
    const client = this;
    const docId = docPath.split("/").pop()!;

    return {
      id: docId,
      path: docPath,
      collection(subName: string): CollectionReference {
        return client.createCollectionRef(`${docPath}/${subName}`);
      },
      async get(): Promise<DocumentSnapshot> {
        const url = `${client.urlBase}/${docPath}`;
        const res = await client.fetch(url, { method: "GET" });
        if (res.status === 404) {
          return { id: docId, exists: false, data: () => undefined };
        }
        if (!res.ok) {
          throw new Error(`Failed to get doc ${docPath}: ${res.status} ${await res.text()}`);
        }
        const json = (await res.json()) as { fields?: Record<string, any> };
        const data = fromFirestoreFields(json.fields);
        return { id: docId, exists: true, data: () => data };
      },
      async set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
        let url = `${client.urlBase}/${docPath}`;
        if (options?.merge) {
          const fieldPaths = Object.keys(data)
            .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
            .join("&");
          url += `?${fieldPaths}`;
        }
        const res = await client.fetch(url, {
          method: "PATCH",
          body: JSON.stringify({ fields: toFirestoreFields(data) }),
        });
        if (!res.ok) {
          throw new Error(`Failed to set doc ${docPath}: ${res.status} ${await res.text()}`);
        }
      },
      async update(data: Record<string, any>): Promise<void> {
        const fieldPaths = Object.keys(data)
          .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
          .join("&");
        const url = `${client.urlBase}/${docPath}?${fieldPaths}&currentDocument.exists=true`;
        const res = await client.fetch(url, {
          method: "PATCH",
          body: JSON.stringify({ fields: toFirestoreFields(data) }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update doc ${docPath}: ${res.status} ${await res.text()}`);
        }
      },
      async delete(): Promise<void> {
        const url = `${client.urlBase}/${docPath}`;
        const res = await client.fetch(url, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          throw new Error(`Failed to delete doc ${docPath}: ${res.status} ${await res.text()}`);
        }
      },
    };
  }

  private createQueryRef(collPath: string, filters: Array<{ field: string; op: string; value: any }>): QueryReference {
    const client = this;
    return {
      where(field: string, op: string, value: any): QueryReference {
        return client.createQueryRef(collPath, [...filters, { field, op, value }]);
      },
      async get(): Promise<QuerySnapshot> {
        const collectionId = collPath.split("/").pop()!;

        let whereClause: any = undefined;
        if (filters.length === 1) {
          const f = filters[0];
          whereClause = {
            fieldFilter: {
              field: { fieldPath: f.field },
              op: mapOp(f.op),
              value: toFirestoreValue(f.value),
            },
          };
        } else if (filters.length > 1) {
          whereClause = {
            compositeFilter: {
              op: "AND",
              filters: filters.map((f) => ({
                fieldFilter: {
                  field: { fieldPath: f.field },
                  op: mapOp(f.op),
                  value: toFirestoreValue(f.value),
                },
              })),
            },
          };
        }

        const res = await client.fetch(`${client.urlBase}:runQuery`, {
          method: "POST",
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              ...(whereClause ? { where: whereClause } : {}),
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed query on ${collPath}: ${res.status} ${await res.text()}`);
        }

        const results = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, any> } }>;
        const docs: DocumentSnapshot[] = [];

        for (const item of results) {
          if (item.document) {
            const docId = item.document.name.split("/").pop()!;
            const data = fromFirestoreFields(item.document.fields);
            docs.push({
              id: docId,
              exists: true,
              data: () => data,
            });
          }
        }

        return {
          docs,
          empty: docs.length === 0,
          size: docs.length,
        };
      },
    };
  }

  async runTransaction<T>(updateFunction: (tx: Transaction) => Promise<T>): Promise<T> {
    const client = this;
    // 1. Begin transaction
    const beginRes = await client.fetch(`${client.urlBase}:beginTransaction`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!beginRes.ok) {
      throw new Error(`Failed to begin transaction: ${beginRes.status} ${await beginRes.text()}`);
    }
    const { transaction } = (await beginRes.json()) as { transaction: string };

    const writes: any[] = [];

    const tx: Transaction = {
      async get(ref: DocumentReference): Promise<DocumentSnapshot> {
        const url = `${client.urlBase}/${ref.path}?transaction=${encodeURIComponent(transaction)}`;
        const res = await client.fetch(url, { method: "GET" });
        const docId = ref.id;
        if (res.status === 404) {
          return { id: docId, exists: false, data: () => undefined };
        }
        if (!res.ok) {
          throw new Error(`Failed tx get ${ref.path}: ${res.status} ${await res.text()}`);
        }
        const json = (await res.json()) as { fields?: Record<string, any> };
        return { id: docId, exists: true, data: () => fromFirestoreFields(json.fields) };
      },
      set(ref: DocumentReference, data: Record<string, any>, options?: { merge?: boolean }): void {
        const fullDocName = `${client.rootDocPath}/${ref.path}`;
        const updateObj: any = {
          name: fullDocName,
          fields: toFirestoreFields(data),
        };
        const write: any = { update: updateObj };
        if (options?.merge) {
          write.updateMask = { fieldPaths: Object.keys(data) };
        }
        writes.push(write);
      },
      update(ref: DocumentReference, data: Record<string, any>): void {
        const fullDocName = `${client.rootDocPath}/${ref.path}`;
        writes.push({
          update: {
            name: fullDocName,
            fields: toFirestoreFields(data),
          },
          updateMask: { fieldPaths: Object.keys(data) },
          currentDocument: { exists: true },
        });
      },
      delete(ref: DocumentReference): void {
        const fullDocName = `${client.rootDocPath}/${ref.path}`;
        writes.push({ delete: fullDocName });
      },
    };

    const result = await updateFunction(tx);

    if (writes.length > 0) {
      const commitRes = await client.fetch(`${client.urlBase}:commit`, {
        method: "POST",
        body: JSON.stringify({
          transaction,
          writes,
        }),
      });
      if (!commitRes.ok) {
        throw new Error(`Failed to commit transaction: ${commitRes.status} ${await commitRes.text()}`);
      }
    }

    return result;
  }
}

function mapOp(op: string): string {
  switch (op) {
    case "<":
      return "LESS_THAN";
    case "<=":
      return "LESS_THAN_OR_EQUAL";
    case ">":
      return "GREATER_THAN";
    case ">=":
      return "GREATER_THAN_OR_EQUAL";
    case "==":
    case "=":
      return "EQUAL";
    case "!=":
      return "NOT_EQUAL";
    case "array-contains":
      return "ARRAY_CONTAINS";
    default:
      return "EQUAL";
  }
}

// ── Singleton Accessor ──────────────────────────────────────────────────────

let _db: FirestoreClient | null = null;

export function getDb(): FirestoreClient {
  if (!_db) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not set — required for Firestore access.");
    }
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    _db = new FirestoreClient(serviceAccount);
  }
  return _db;
}
