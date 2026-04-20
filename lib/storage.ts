import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type UploadInput = {
  buffer: Buffer;
  fileName: string;
  cycleYear: number;
  userFolder: string;
};

type StoredDocument = {
  storageKey: string;
  url: string;
};

type PersistedDocument = {
  storageKey: string;
  url: string;
};

const DEFAULT_STORAGE_BUCKET = "documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

let cachedSupabase: SupabaseClient | null = null;
let ensuredBucketName: string | null = null;

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("SUPABASE_URL nao definida.");
  }

  return url;
}

function getSupabaseServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET?.trim();

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao definida.");
  }

  return key;
}

function getStorageBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;
}

function sanitizeStorageSegment(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "arquivo"
  );
}

function buildStoragePath(input: UploadInput): string {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");

  return [
    `ciclo-${input.cycleYear}`,
    sanitizeStorageSegment(input.userFolder),
    `${stamp}-${sanitizeStorageSegment(input.fileName)}`,
  ].join("/");
}

function isLegacyExternalUrl(url: string, storageKey: string): boolean {
  return /^https?:\/\//i.test(url) && !storageKey.includes("/");
}

function getSupabaseAdminClient(): SupabaseClient {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  cachedSupabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabase;
}

async function ensureStorageBucket() {
  const bucket = getStorageBucketName();

  if (ensuredBucketName === bucket) {
    return bucket;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage.getBucket(bucket);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(`Falha ao consultar bucket do Supabase Storage: ${error.message}`);
  }

  if (!data) {
    const { error: createError } = await client.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["application/pdf"],
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Falha ao criar bucket do Supabase Storage: ${createError.message}`);
    }
  }

  ensuredBucketName = bucket;
  return bucket;
}

async function createSignedDocumentUrl(storageKey: string) {
  const client = getSupabaseAdminClient();
  const bucket = await ensureStorageBucket();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao criar URL assinada do documento: ${error?.message ?? "sem resposta"}`);
  }

  return data.signedUrl;
}

export async function storeDocument(input: UploadInput): Promise<StoredDocument> {
  const client = getSupabaseAdminClient();
  const bucket = await ensureStorageBucket();
  const path = buildStoragePath(input);
  const { error } = await client.storage
    .from(bucket)
    .upload(path, input.buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload para o Supabase Storage falhou: ${error.message}`);
  }

  return {
    storageKey: path,
    url: await createSignedDocumentUrl(path),
  };
}

export async function resolveDocumentAccessUrl(document: PersistedDocument) {
  if (isLegacyExternalUrl(document.url, document.storageKey)) {
    return document.url;
  }

  return createSignedDocumentUrl(document.storageKey);
}

export async function resolveDocumentAccessUrls<T extends PersistedDocument>(documents: T[]) {
  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      url: await resolveDocumentAccessUrl(document),
    })),
  );
}

export { buildStoragePath, isLegacyExternalUrl };
