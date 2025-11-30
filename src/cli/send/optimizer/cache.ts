import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { findRootDirOfFile } from '../../../utils';
import { DependencyModel } from './types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  file?: string;
}

const CACHE_FILE = '.uctest-deps';

export async function loadCache(rootDir: string): Promise<DependencyModel | undefined> {
  const cachePath = path.join(rootDir, CACHE_FILE);
  try {
    const content = await fs.promises.readFile(cachePath, 'utf-8');
    return JSON.parse(content) as DependencyModel;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

export async function saveCache(rootDir: string, model: DependencyModel): Promise<void> {
  const cachePath = path.join(rootDir, CACHE_FILE);
  await fs.promises.writeFile(cachePath, JSON.stringify(model, null, 2), 'utf-8');
}

export async function validateCache(cached: DependencyModel, rootDir: string): Promise<ValidationResult> {
  const { globby } = await import('globby');
  const currentFiles = (await globby('**/*.http', { cwd: rootDir })).sort();
  const cachedFiles = Object.keys(cached.files).sort();

  if (!arraysEqual(currentFiles, cachedFiles)) {
    return { valid: false, reason: 'files_changed' };
  }

  for (const [file, entry] of Object.entries(cached.files)) {
    const stat = fs.statSync(path.join(rootDir, file));
    if (stat.mtimeMs !== entry.mtime || stat.size !== entry.size) {
      const checksum = computeChecksum(path.join(rootDir, file));
      if (checksum !== entry.checksum) {
        return { valid: false, reason: 'content_changed', file };
      }
    }
  }

  return { valid: true };
}

export async function findCacheRoot(specPath: string): Promise<string> {
  const root = await findRootDirOfFile(specPath);
  if (root) {
    return root as string;
  }
  return path.dirname(specPath);
}

function computeChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, idx) => val === b[idx]);
}
