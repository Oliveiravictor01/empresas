import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase App if initialized, or initialize
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
];

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogleDrive = async () => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
};

// ==========================================
// Google Drive API v3 Types and Helpers
// ==========================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[];
  shared?: boolean;
}

export interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * List files and folders from Google Drive
 */
export async function listDriveFiles(
  folderId: string = 'root',
  searchTerm: string = '',
  pageSize: number = 50
): Promise<DriveListResponse> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive não autenticado. Faça login primeiro.');
  }

  let query = `'${folderId}' in parents and trashed = false`;
  if (searchTerm.trim()) {
    const escaped = searchTerm.replace(/'/g, "\\'");
    query += ` and name contains '${escaped}'`;
  }

  const params = new URLSearchParams({
    q: query,
    pageSize: pageSize.toString(),
    fields:
      'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, owners, shared)',
    orderBy: 'folder, modifiedTime desc, name',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ao consultar arquivos no Google Drive (${res.status})`);
  }

  return res.json();
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  name: string,
  parentFolderId: string = 'root'
): Promise<DriveFile> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive não autenticado.');
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao criar pasta no Google Drive.');
  }

  return res.json();
}

/**
 * Upload a binary or text file to Google Drive
 */
export async function uploadDriveFile(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId: string = 'root'
): Promise<DriveFile> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive não autenticado.');
  }

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file, fileName);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao enviar arquivo para o Google Drive.');
  }

  return res.json();
}

/**
 * Upload text/JSON content directly as a file (e.g. for backups or exports)
 */
export async function uploadJsonBackupToDrive(
  jsonData: any,
  fileName: string,
  parentFolderId: string = 'root'
): Promise<DriveFile> {
  const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: 'application/json',
  });
  return uploadDriveFile(jsonBlob, fileName, 'application/json', parentFolderId);
}

/**
 * Delete a file or folder from Google Drive
 * (Caller MUST show confirmation modal before executing!)
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive não autenticado.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao excluir arquivo do Google Drive.');
  }

  return true;
}

/**
 * Helper to format bytes to human readable sizes
 */
export function formatBytes(bytes?: string | number, decimals = 2) {
  if (!bytes) return '—';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
