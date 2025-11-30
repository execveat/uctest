import fs from 'fs';
import os from 'os';
import path from 'path';

import { buildDependencyModel } from '../staticParser';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uctest-static-'));
}

function writeHttpFile(dir: string, name: string, content: string) {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
  return filePath;
}

function cleanup(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('staticParser', () => {
  it('rejects dynamic metadata in name/ref/import', async () => {
    const dir = createTempDir();
    try {
      writeHttpFile(
        dir,
        'bad.http',
        `
# @name {{dyn}}
GET https://example.test
`
      );

      await expect(buildDependencyModel(dir)).rejects.toThrow(/Dynamic @name not allowed/);
    } finally {
      cleanup(dir);
    }
  });

  it('detects circular imports', async () => {
    const dir = createTempDir();
    try {
      writeHttpFile(
        dir,
        'a.http',
        `
# @import b.http
GET https://example.test/a
`
      );
      writeHttpFile(
        dir,
        'b.http',
        `
# @import a.http
GET https://example.test/b
`
      );

      await expect(buildDependencyModel(dir)).rejects.toThrow(/Circular import: a.http .* b.http .* a.http/);
    } finally {
      cleanup(dir);
    }
  });

  it('enforces unique names within import visibility', async () => {
    const dir = createTempDir();
    try {
      writeHttpFile(
        dir,
        'a.http',
        `
# @name setup
GET https://example.test/a
`
      );
      writeHttpFile(
        dir,
        'b.http',
        `
# @import a.http
# @name setup
GET https://example.test/b
`
      );

      await expect(buildDependencyModel(dir)).rejects.toThrow(/Duplicate @name "setup" in scope of b.http/);
    } finally {
      cleanup(dir);
    }
  });

  it('parses regions, refs, and tags', async () => {
    const dir = createTempDir();
    try {
      writeHttpFile(
        dir,
        'sample.http',
        `
# @name setup
# @tag smoke,ci
GET https://example.test/setup
### @name child
# @ref setup
GET https://example.test/child
`
      );

      const model = await buildDependencyModel(dir);
      expect(Object.keys(model.files)).toContain('sample.http');
      const fileEntry = model.files['sample.http'];
      expect(fileEntry.regionIds).toHaveLength(2);

      const first = model.regions[fileEntry.regionIds[0]];
      expect(first.name).toBe('setup');
      expect(first.tags).toEqual(['smoke', 'ci']);
      expect(first.refs).toEqual([]);

      const second = model.regions[fileEntry.regionIds[1]];
      expect(second.name).toBe('child');
      expect(second.refs).toEqual(['setup']);
      expect(second.forceRefs).toEqual([]);
    } finally {
      cleanup(dir);
    }
  });
});
