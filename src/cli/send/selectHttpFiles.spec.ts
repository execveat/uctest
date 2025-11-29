import { HttpFile, HttpRegion } from '../../store';
import { selectHttpFiles } from './selectHttpFiles';

function createHttpFile(name: string, httpRegions: Array<Record<string, string>>) {
  const httpFile = new HttpFile(name);
  httpRegions.forEach((metaData, index) => {
    const httpRegion = new HttpRegion(httpFile, index);
    httpFile.httpRegions.push(httpRegion);
    Object.assign(httpRegion.metaData, metaData);
    httpRegion.symbol.name = metaData.name;
  });
  return httpFile;
}

describe('selectHttpFiles', () => {
  const defaultHttpFiles: Array<HttpFile> = [
    createHttpFile('test1', [
      {
        name: 'foo1',
        tag: 'foo',
      },
      {
        name: 'foo2',
        tag: 'foo',
      },
      {
        name: 'foo3',
        tag: 'bar',
      },
      {
        name: 'foo4',
        tag: 'bar',
      },
      {
        name: 'foo_both',
        tag: 'foo, bar',
      },
      {
        name: 'foo5',
        tag: 'fuu',
      },
    ]),
    createHttpFile('test2', [
      {
        name: 'test1',
        tag: 'test',
      },
      {
        name: 'test2',
        tag: 'test',
      },
    ]),
  ];
  it('should export', () => {
    expect(selectHttpFiles).toBeDefined();
  });

  // Note: --all flag removed. No filters = all tests now.
  it('should return values by name', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { name: ['foo1'] });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1']]);
  });
  it('should return values by multiple names', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { name: ['foo1', 'test2'] });

    expect(result.length).toBe(2);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1', 'test2']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1'], ['test2']]);
  });
  // Tag filtering now uses AND logic: all specified tags must be present
  it('should use AND logic for multiple tag arguments', async () => {
    // When tags: ['foo', 'bar'], only regions with BOTH tags should match
    const result = await selectHttpFiles(defaultHttpFiles, { tag: ['foo', 'bar'] });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    // Only foo_both has both 'foo' and 'bar' tags
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo_both']]);
  });

  it('should return empty when no region has all required tags', async () => {
    // foo and fuu are never on the same region
    const result = await selectHttpFiles(defaultHttpFiles, { tag: ['foo', 'fuu'] });
    expect(result.length).toBe(0);
  });

  it('should match single tag', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { tag: ['foo'] });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([
      ['foo1', 'foo2', 'foo_both'],
    ]);
  });
  it('should return values by line', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { line: 1 });

    expect(result.length).toBe(2);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1', 'test2']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo2'], ['test2']]);
  });

  // Name and tag filters use AND between them
  it('should use AND between name and tag filters', async () => {
    // foo1 and foo2 both have tag 'foo', so they should match
    const result = await selectHttpFiles(defaultHttpFiles, {
      name: ['foo1', 'foo2'],
      tag: ['foo'],
    });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1', 'foo2']]);
  });

  it('should exclude when name matches but tag does not', async () => {
    // foo3 has tag 'bar', not 'foo'
    const result = await selectHttpFiles(defaultHttpFiles, {
      name: ['foo3'],
      tag: ['foo'],
    });

    expect(result.length).toBe(0);
  });

  it('should exclude when tag matches but name does not', async () => {
    // 'nonexistent' name doesn't exist
    const result = await selectHttpFiles(defaultHttpFiles, {
      name: ['nonexistent'],
      tag: ['foo'],
    });

    expect(result.length).toBe(0);
  });

  // No filters = all regions
  it('should return all regions when no filters specified', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, {});

    // Should return all files with all their regions
    expect(result.length).toBe(2);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1', 'test2']);
    // httpRegions should be undefined (meaning all regions)
    expect(result.map(h => h.httpRegions)).toEqual([undefined, undefined]);
  });
});
