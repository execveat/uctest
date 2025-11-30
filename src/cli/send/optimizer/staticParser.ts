import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { RegionSeparator } from '../../../utils';
import { DependencyModel, FileEntry, RegionEntry } from './types';

export const DYNAMIC_VAR_REGEX = /\{\{.*?\}\}/;

export interface StaticParserOptions {
  files?: string[];
}

interface RegionDraft {
  startLine: number;
  endLine: number;
  name?: string;
  tags: string[];
  refs: string[];
  forceRefs: string[];
  hasRequest: boolean;
}

export async function buildDependencyModel(rootDir: string, options: StaticParserOptions = {}): Promise<DependencyModel> {
  const absoluteRoot = path.resolve(rootDir);
  const files = options.files?.length ? options.files : await loadHttpFiles(absoluteRoot);
  if (files.length === 0) {
    throw new Error(`No .http files found under ${absoluteRoot}`);
  }

  const model: DependencyModel = {
    version: '1.0',
    generated: new Date().toISOString(),
    rootDir: absoluteRoot,
    files: {},
    regions: {},
    regionsByName: {},
    importGraph: {},
    checksums: {},
    mtimes: {},
  };

  for (const relativeFile of files.sort()) {
    const absolutePath = toAbsolutePath(absoluteRoot, relativeFile);
    const stat = fs.statSync(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');

    const checksum = computeChecksum(content);
    const regionIds: string[] = [];
    const imports = new Set<string>();
    const hasGlobalRegion = parseFile(content, absolutePath, relativeFile, imports, regionIds, model);

    const fileEntry: FileEntry = {
      path: relativeFile,
      checksum,
      mtime: stat.mtimeMs,
      size: stat.size,
      imports: Array.from(imports),
      regionIds,
      hasGlobalRegion,
    };

    model.files[relativeFile] = fileEntry;
    model.importGraph[relativeFile] = fileEntry.imports;
    model.checksums[relativeFile] = checksum;
    model.mtimes[relativeFile] = stat.mtimeMs;
  }

  detectImportCycles(model.importGraph);
  enforceUniqueNames(model);
  return model;
}

async function loadHttpFiles(rootDir: string): Promise<string[]> {
  const { globby } = await import('globby');
  return globby('**/*.http', { cwd: rootDir });
}

export function toAbsolutePath(rootDir: string, file: string): string {
  return path.isAbsolute(file) ? file : path.join(rootDir, file);
}

function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parseFile(
  content: string,
  absolutePath: string,
  relativePath: string,
  imports: Set<string>,
  regionIds: string[],
  model: DependencyModel
): boolean {
  const lines = content.split(/\r?\n/u);
  let hasGlobalRegion = false;
  let current: RegionDraft = createRegionDraft(0);

  const finalizeRegion = (endLine: number) => {
    current.endLine = endLine;
    const entry = toRegionEntry(current, absolutePath, relativePath);
    model.regions[entry.id] = entry;
    regionIds.push(entry.id);
    if (entry.name) {
      const list = model.regionsByName[entry.name] || [];
      list.push(entry.id);
      model.regionsByName[entry.name] = list;
    }
    if (entry.isGlobal) {
      hasGlobalRegion = true;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const separatorMatch = RegionSeparator.exec(line);
    if (separatorMatch) {
      finalizeRegion(Math.max(index - 1, current.startLine));
      current = createRegionDraft(index + 1);
      const trailing = separatorMatch.groups?.title?.trim();
      if (trailing) {
        const metaFromDelimiter = parseMeta(`# ${trailing}`);
        if (metaFromDelimiter) {
          applyMeta(metaFromDelimiter, current, imports, index + 1, relativePath);
        }
      }
      continue;
    }

    const meta = parseMeta(line);
    if (meta) {
      applyMeta(meta, current, imports, index + 1, relativePath);
    }

    if (isRequestLine(line)) {
      current.hasRequest = true;
    }
  }

  finalizeRegion(lines.length - 1);
  return hasGlobalRegion;
}

function createRegionDraft(startLine: number): RegionDraft {
  return {
    startLine,
    endLine: startLine,
    tags: [],
    refs: [],
    forceRefs: [],
    hasRequest: false,
  };
}

function toRegionEntry(draft: RegionDraft, absolutePath: string, relativePath: string): RegionEntry {
  const id = `${absolutePath}_${draft.startLine}`;
  const modelId = `${relativePath}:${draft.startLine}`;
  return {
    id,
    modelId,
    file: relativePath,
    startLine: draft.startLine,
    endLine: draft.endLine,
    name: draft.name,
    tags: dedupeStrings(draft.tags),
    refs: dedupeStrings(draft.refs),
    forceRefs: dedupeStrings(draft.forceRefs),
    isGlobal: !draft.hasRequest,
  };
}

function parseMeta(
  line: string
): { key: 'name' | 'tag' | 'ref' | 'forceRef' | 'import'; value: string } | null {
  const match = /^\s*(#+|\/{2,})\s+@(?<key>[^\s]+)\s*(?<value>.*)$/u.exec(line);
  if (!match?.groups?.key) {
    return null;
  }
  const rawKey = match.groups.key;
  if (!['name', 'tag', 'ref', 'forceRef', 'import'].includes(rawKey)) {
    return null;
  }
  const value = (match.groups.value || '').trim();
  return { key: rawKey as 'name' | 'tag' | 'ref' | 'forceRef' | 'import', value };
}

function applyMeta(
  meta: { key: 'name' | 'tag' | 'ref' | 'forceRef' | 'import'; value: string },
  target: RegionDraft,
  imports: Set<string>,
  lineNumber: number,
  sourcePath: string
) {
  switch (meta.key) {
    case 'import':
      validateNoDynamic(meta.value, 'Dynamic import not allowed', lineNumber);
      imports.add(resolveImportPath(meta.value, sourcePath));
      break;
    case 'name':
      validateNoDynamic(meta.value, 'Dynamic @name not allowed', lineNumber);
      target.name = meta.value;
      break;
    case 'tag':
      target.tags.push(...splitList(meta.value));
      break;
    case 'ref':
      validateNoDynamic(meta.value, 'Dynamic ref not allowed', lineNumber);
      target.refs.push(...splitList(meta.value));
      break;
    case 'forceRef':
      validateNoDynamic(meta.value, 'Dynamic ref not allowed', lineNumber);
      target.forceRefs.push(...splitList(meta.value));
      break;
    default:
      break;
  }
}

function splitList(value: string): string[] {
  return value
    .split(/[,\s]+/u)
    .map(part => part.trim())
    .filter(Boolean);
}

function validateNoDynamic(value: string, message: string, line: number) {
  if (DYNAMIC_VAR_REGEX.test(value)) {
    throw new Error(`${message} (line ${line}): use literal. Found: ${value}`);
  }
}

function resolveImportPath(value: string, fromPath: string): string {
  if (path.isAbsolute(value)) {
    return value;
  }
  const baseDir = path.dirname(fromPath);
  const resolved = path.normalize(path.join(baseDir, value));
  return resolved.split(path.sep).join('/');
}

function isRequestLine(line: string): boolean {
  return /^\s*(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE|CONNECT)\s+/iu.test(line);
}

function detectImportCycles(importGraph: Record<string, string[]>) {
  const stack: string[] = [];
  const visited = new Set<string>();

  const visit = (file: string) => {
    if (stack.includes(file)) {
      const start = stack.indexOf(file);
      const cycle = [...stack.slice(start), file];
      throw new Error(`Circular import: ${cycle.join(' → ')}`);
    }
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    stack.push(file);
    const imports = importGraph[file] || [];
    for (const imp of imports) {
      visit(imp);
    }
    stack.pop();
  };

  Object.keys(importGraph).forEach(visit);
}

function enforceUniqueNames(model: DependencyModel) {
  for (const file of Object.keys(model.files)) {
    const visibleFiles = getVisibleFiles(file, model.importGraph);
    const seen = new Map<string, string>();
    for (const visible of visibleFiles) {
      const entry = model.files[visible];
      if (!entry) {
        continue;
      }
      for (const regionId of entry.regionIds) {
        const region = model.regions[regionId];
        if (region?.name) {
          const existing = seen.get(region.name);
          if (existing) {
            throw new Error(
              `Duplicate @name "${region.name}" in scope of ${file}: ${existing} and ${region.file}:${region.startLine}`
            );
          }
          seen.set(region.name, `${region.file}:${region.startLine}`);
        }
      }
    }
  }
}

function getVisibleFiles(source: string, importGraph: Record<string, string[]>) {
  const result: string[] = [];
  const queue = [source];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    result.push(current);
    const imports = importGraph[current] || [];
    for (const imp of imports) {
      queue.push(imp);
    }
  }

  return result;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
