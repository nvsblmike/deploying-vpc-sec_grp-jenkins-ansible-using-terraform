import { mkdir } from 'fs/promises';
import { join } from 'path';

export async function ensureUploadDir() {
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'attendance');
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (error) {
    // Directory already exists or error creating it
    console.error('Error creating upload directory:', error);
  }
  return uploadDir;
}
