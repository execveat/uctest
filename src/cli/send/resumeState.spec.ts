import { HttpFile, HttpRegion } from '../../store';
import { applyResumeState } from './send';

function createRegion(
  httpFile: HttpFile,
  startLine: number,
  metaData: { name?: string } = {}
): HttpRegion {
  const region = new HttpRegion(httpFile, startLine);
  Object.assign(region.metaData, metaData);
  httpFile.httpRegions.push(region);
  return region;
}

describe('applyResumeState', () => {
  it('skips requests before resume target', () => {
    const httpFile = new HttpFile('test');
    createRegion(httpFile, 1, { name: 'one' });
    const target = createRegion(httpFile, 5, { name: 'two' });
    createRegion(httpFile, 10, { name: 'three' });

    const state = { fileName: 'test', line: target.symbol.startLine, name: target.metaData.name };

    const result = applyResumeState([{ httpFile }], state);

    const regions = (result[0].httpRegions ?? result[0].httpFile.httpRegions).map(r => r.metaData.name);
    expect(regions).toEqual(['two', 'three']);
  });
});
