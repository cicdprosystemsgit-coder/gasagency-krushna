/**
 * Google Drive Helper — Admin Personal Drive
 *
 * Uses admin's pre-generated OAuth2 refresh token.
 * No user login or OAuth consent flow required.
 * All employee docs are stored under: GasAgency-Docs / {EmployeeName} / file
 */

import { google } from "googleapis";
import { Readable } from "stream";

// ── Auth client (singleton-like, reused per request) ─────────────────────────

function createDriveClient() {
  const clientId     = process.env.GOOGLE_DRIVE_CLIENT_ID;
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

// ── Folder helpers ────────────────────────────────────────────────────────────

const ROOT_FOLDER_NAME = "GasAgency-Employee-Docs";

async function getRootFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  const res = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create root folder
  const folder = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  return folder.data.id!;
}

async function getEmployeeFolder(
  drive: ReturnType<typeof google.drive>,
  rootId: string,
  employeeId: string,
  employeeName: string
): Promise<string> {
  const folderName = `${employeeName} [${employeeId.slice(-6)}]`;

  const res = await drive.files.list({
    q: `name='${folderName}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });
  return folder.data.id!;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file to admin's Google Drive under the employee's subfolder.
 * Returns fileId and a shareable view URL.
 */
export async function uploadToAdminDrive(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  employeeId: string;
  employeeName: string;
}): Promise<{ fileId: string; driveViewUrl: string }> {
  const drive = createDriveClient();

  const rootId = await getRootFolder(drive);
  const folderId = await getEmployeeFolder(drive, rootId, params.employeeId, params.employeeName);

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.fileBuffer),
    },
    fields: "id,webViewLink",
  });

  const fileId = res.data.id!;

  // Make file viewable by anyone with the link
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { fileId, driveViewUrl: res.data.webViewLink! };
}

/**
 * Delete a file from admin's Google Drive.
 */
export async function deleteFromAdminDrive(fileId: string): Promise<void> {
  const drive = createDriveClient();
  try {
    await drive.files.delete({ fileId });
  } catch {
    // File may already be deleted from Drive — log and continue
    console.warn(`[google-drive] Could not delete file ${fileId} — it may already be removed.`);
  }
}

/**
 * Check if Drive credentials are configured in env.
 */
export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}
