import { HttpFile, HttpRegion } from '../../store';
import { applyPruneRefs } from './send';

function createRegion(
  httpFile: HttpFile,
  metaData: { name?: string; ref?: string; forceRef?: string } = {}
): HttpRegion {
  const region = new HttpRegion(httpFile, httpFile.httpRegions.length);
  Object.assign(region.metaData, metaData);
  httpFile.httpRegions.push(region);
  return region;
}

describe('applyPruneRefs', () => {
  it('keeps only leaf requests', () => {
    const httpFile = new HttpFile('test');
    createRegion(httpFile, { name: 'setup' });
    createRegion(httpFile, { name: 'middle', ref: 'setup' });
    createRegion(httpFile, { name: 'leaf', ref: 'middle' });

    const result = applyPruneRefs([{ httpFile }]);

    expect(result.length).toBe(1);
    expect(result[0].httpRegions?.map(r => r.metaData.name)).toEqual(['leaf']);
  });

  it('handles selections across files and preserves unnamed regions', () => {
    const fileA = new HttpFile('a');
    const unnamed = createRegion(fileA, {});
    createRegion(fileA, { name: 'shared' });

    const fileB = new HttpFile('b');
    createRegion(fileB, { name: 'leaf', forceRef: 'shared' });

    const result = applyPruneRefs([
      { httpFile: fileA },
      { httpFile: fileB },
    ]);

    expect(result.length).toBe(2);

    const prunedA = result.find(entry => entry.httpFile === fileA);
    expect(prunedA).toBeDefined();
    const regionsA = prunedA?.httpRegions ?? prunedA?.httpFile.httpRegions ?? [];
    expect(regionsA.map(r => r.metaData.name)).toEqual([undefined]);

    const prunedB = result.find(entry => entry.httpFile === fileB);
    expect(prunedB).toBeDefined();
    const regionsB = prunedB?.httpRegions ?? prunedB?.httpFile.httpRegions ?? [];
    expect(regionsB.map(r => r.metaData.name)).toEqual(['leaf']);
  });
});
