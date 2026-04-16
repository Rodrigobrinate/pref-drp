import { Readable } from "stream";
import { google } from "googleapis";

type UploadInput = {
  buffer: Buffer;
  fileName: string;
  cycleYear: number;
  userFolder: string;
};

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];
let cachedDrive: ReturnType<typeof google.drive> | null = null;

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function getDriveCredentials(): Promise<ServiceAccountCredentials> {
  const raw = process.env.GOOGLE_DRIVE_CREDENTIALS_JSON;

  if (!raw) {
    throw new Error("GOOGLE_DRIVE_CREDENTIALS_JSON nao definida");
  }

  const parsed = JSON.parse(raw) as Partial<ServiceAccountCredentials>;

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Arquivo de credenciais do Google Drive inválido.");
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

async function getDriveClient() {
  if (cachedDrive) {
    return cachedDrive;
  }

  const credentials = await getDriveCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: DRIVE_SCOPES,
  });

  cachedDrive = google.drive({
    version: "v3",
    auth,
  });

  return cachedDrive;
}

function getDriveFlags() {
  const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

  if (!sharedDriveId) {
    return {};
  }

  return {
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    driveId: sharedDriveId,
    corpora: "drive" as const,
  };
}

async function findOrCreateFolder(name: string, parentId: string) {
  const drive = await getDriveClient();
  const flags = getDriveFlags();
  const query = [
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = '${FOLDER_MIME_TYPE}'`,
    "trashed = false",
    `'${escapeDriveQueryValue(parentId)}' in parents`,
  ].join(" and ");

  const existing = await drive.files.list({
    ...flags,
    q: query,
    fields: "files(id, name)",
    pageSize: 1,
  });

  const folderId = existing.data.files?.[0]?.id;

  if (folderId) {
    return folderId;
  }

  const created = await drive.files.create({
    ...flags,
    requestBody: {
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error(`Não foi possível criar a pasta '${name}' no Google Drive.`);
  }

  return created.data.id;
}

function getRootFolderId(): string {
  const configured = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  return configured ? configured : "root";
}

function getCycleFolderName(cycleYear: number): string {
  const prefix = process.env.GOOGLE_DRIVE_CYCLE_PREFIX?.trim();
  return prefix
    ? `${prefix} ${cycleYear}`
    : `Avaliação ${cycleYear}`;
}

export async function storeDocumentInDrive(input: UploadInput) {
  const drive = await getDriveClient();
  const flags = getDriveFlags();
  const cycleFolderId = await findOrCreateFolder(getCycleFolderName(input.cycleYear), getRootFolderId());
  const userFolderId = await findOrCreateFolder(input.userFolder, cycleFolderId);

  const upload = await drive.files.create({
    ...flags,
    requestBody: {
      name: input.fileName,
      parents: [userFolderId],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(input.buffer),
    },
    fields: "id, webViewLink, webContentLink, name",
  });

  const fileId = upload.data.id;

  if (!fileId) {
    throw new Error("Upload para o Google Drive falhou.");
  }

  return {
    storageKey: fileId,
    url: upload.data.webViewLink ?? upload.data.webContentLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}
