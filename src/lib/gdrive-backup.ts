/**
 * src/lib/gdrive-backup.ts
 * Google Drive utility for backing up delivery proof photos.
 *
 * Design:
 *  - Mirrors the same folder structure as AWS S3:
 *    GasAgency-Delivery-Backups / agencies / {agencyId} / {YYYY-MM} / {file}.jpg
 *  - Uses the same OAuth2 credentials as employee docs (google-drive.ts)
 *  - Folder IDs are cached per backup run to minimize Drive API calls
 *  - Idempotent: checks if file already exists before uploading
 *
 * NOTE: This module only handles uploads. DB URL updates and Cloudinary
 * cleanup are managed by the backup-orchestrator.
 */

import { google } from "googleapis";
import { Readable } from "stream";
import { buildAgencyFolderName } from "@/lib/s3-backup";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriveCopyResult {
  success: boolean;
  drivePath: string;
  driveFileId?: string;
  skipped: boolean; // true = already existed in Drive
  error?: string;
}

// ── Drive Client ──────────────────────────────────────────────────────────────

function createBackupDriveClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google Drive env vars: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN"
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

// ── Folder Cache & Management ─────────────────────────────────────────────────

const BACKUP_ROOT_FOLDER_NAME = "GasAgency-Delivery-Backups";

/** Per-invocation cache to avoid repeated Drive API list calls */
const folderCache = new Map<string, string>();

/**
 * Clear the folder cache. Call at the start of each new backup run.
 */
export function clearFolderCache(): void {
  folderCache.clear();
}

/**
 * Get or create a subfolder under a parent folder.
 * Caches folder IDs to minimize API calls within a single backup run.
 */
async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  const cacheKey = `${parentId}/${folderName}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  // Search for existing folder
  const safeName = folderName.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let folderId: string;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });
    folderId = folder.data.id!;
  }

  folderCache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Get or create the backup root folder in Google Drive.
 * If GOOGLE_DRIVE_BACKUP_FOLDER_ID is set, uses that folder directly.
 * Otherwise creates "GasAgency-Delivery-Backups" in My Drive root.
 */
async function getBackupRootFolder(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  // If a specific folder ID is configured, use it directly
  const configuredFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (configuredFolderId) return configuredFolderId;

  const cacheKey = "__backup_root__";
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  // Search in My Drive root
  const res = await drive.files.list({
    q: `name='${BACKUP_ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  let folderId: string;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: BACKUP_ROOT_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = folder.data.id!;
  }

  folderCache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Ensure the full folder hierarchy exists and return the leaf folder ID.
 * Path: root / agencies / {agencyId} / {YYYY-MM}
 */
async function ensureFolderPath(
  drive: ReturnType<typeof google.drive>,
  rootId: string,
  pathSegments: string[]
): Promise<string> {
  let currentParentId = rootId;
  for (const segment of pathSegments) {
    currentParentId = await getOrCreateFolder(drive, currentParentId, segment);
  }
  return currentParentId;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the Drive folder path segments and file name for a delivery proof photo.
 * Mirrors S3 key structure (multi-tenant, daily sub-folders):
 *   agencies/{agencyName}_{agencyId}/backups/{YYYY-MM-DD}/{deliveryId}_{type}.jpg
 */
export function buildDrivePath(
  agencyId: string,
  deliveryId: string,
  type: "payment_receipt" | "customer_card" | "additional",
  date: Date,
  agencyName?: string | null
): { pathSegments: string[]; fileName: string } {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const agencyFolder = buildAgencyFolderName(agencyId, agencyName);
  return {
    pathSegments: ["agencies", agencyFolder, "backups", dateStr],
    fileName: `${deliveryId}_${type}.jpg`,
  };
}

/**
 * Check if a file with the given name already exists in a Drive folder.
 * Returns the file ID if found, null otherwise.
 */
async function doesDriveFileExist(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  fileName: string
): Promise<string | null> {
  try {
    const safeName = fileName.replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `name='${safeName}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check if Google Drive backup credentials are configured in env.
 */
export function isDriveBackupConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}

/**
 * Copy a pre-downloaded image buffer to Google Drive.
 * - Creates the folder hierarchy (agencies/{agencyName}_{agencyId}/backups/{YYYY-MM-DD}) if needed
 * - Checks Drive first for idempotency (skips if file already exists)
 * - Returns structured result object
 */
export async function copyBufferToDrive(params: {
  imageBuffer: Buffer;
  agencyId: string;
  deliveryId: string;
  type: "payment_receipt" | "customer_card" | "additional";
  date: Date;
  agencyName?: string | null;
  contentType?: string;
}): Promise<DriveCopyResult> {
  const { imageBuffer, agencyId, deliveryId, type, date, agencyName, contentType = "image/jpeg" } = params;
  const { pathSegments, fileName } = buildDrivePath(agencyId, deliveryId, type, date, agencyName);
  const drivePath = `${BACKUP_ROOT_FOLDER_NAME}/${pathSegments.join("/")}/${fileName}`;

  try {
    const drive = createBackupDriveClient();

    // Get/create the backup root folder
    const rootId = await getBackupRootFolder(drive);

    // Ensure folder hierarchy: agencies / {agencyId} / {YYYY-MM}
    const targetFolderId = await ensureFolderPath(drive, rootId, pathSegments);

    // Idempotency check — skip if file already exists in this folder
    const existingFileId = await doesDriveFileExist(drive, targetFolderId, fileName);
    if (existingFileId) {
      return { success: true, drivePath, driveFileId: existingFileId, skipped: true };
    }

    // Upload the image buffer to Google Drive
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType: contentType,
        body: Readable.from(imageBuffer),
      },
      fields: "id",
    });

    return {
      success: true,
      drivePath,
      driveFileId: res.data.id!,
      skipped: false,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[GDrive Backup Error] ${drivePath}:`, errorMsg);
    return { success: false, drivePath, skipped: false, error: errorMsg };
  }
}
