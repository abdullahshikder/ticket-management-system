import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/json', 'application/xml',
  'application/zip',
]);

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

export const LIMITS = {
  image: 10 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  totalPerTicket: 500 * 1024 * 1024,
};

export function initStorage() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
}

export function generateStorageKey(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${date}/${hash}${ext}`;
}

export function validateFile(mimeType: string, fileSize: number, originalName: string): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const ext = path.extname(originalName).toLowerCase();
    const executableExts = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.scr', '.pif', '.jar', '.vbs', '.ps1'];
    if (executableExts.includes(ext)) {
      return { valid: false, error: 'Executable files are not allowed' };
    }
    return { valid: false, error: `File type ${mimeType} is not allowed` };
  }

  const maxSize = mimeType.startsWith('video/') ? LIMITS.video
    : mimeType.startsWith('image/') ? LIMITS.image
    : LIMITS.document;

  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` };
  }

  return { valid: true };
}

export function storeFile(buffer: Buffer, storageKey: string): string {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

export function getFilePath(storageKey: string): string {
  return path.join(UPLOAD_DIR, storageKey);
}

export function fileExists(storageKey: string): boolean {
  return fs.existsSync(getFilePath(storageKey));
}

export function deleteFile(storageKey: string): boolean {
  const fp = getFilePath(storageKey);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    return true;
  }
  return false;
}

export function computeChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getFileUrl(storageKey: string): string {
  return `/api/uploads/${storageKey}`;
}

export function generateThumbnail(storageKey: string, mimeType: string): string | null {
  if (!IMAGE_MIME_TYPES.has(mimeType)) return null;

  const thumbKey = `thumb_${storageKey.replace(/\//g, '_')}`;
  const sourcePath = getFilePath(storageKey);
  const thumbPath = path.join(THUMB_DIR, thumbKey);

  if (!fs.existsSync(sourcePath)) return null;
  if (fs.existsSync(thumbPath)) return `/api/uploads/thumbnails/${thumbKey}`;

  try {
    fs.copyFileSync(sourcePath, thumbPath);
    return `/api/uploads/thumbnails/${thumbKey}`;
  } catch {
    return null;
  }
}
