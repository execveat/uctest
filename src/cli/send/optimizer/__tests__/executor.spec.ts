import path from 'path';

import { ENVIRONMENT_NONE } from '../../../../utils';
import { HttpFile, HttpRegion } from '../../../../store';
import { executePlan } from '../executor';
import { DependencyModel, ExecutionPlan, FileEntry, RegionEntry, ResumeState } from '../types';

function createHttpRegion(file: HttpFile, startLine: number, name: string): HttpRegion {
  const region = new HttpRegion(file, startLine);
  region.metaData.name = name;
  file.httpRegions.push(region);
  return region;
}

function buildModel(rootDir: string, file: HttpFile, regions: HttpRegion[]): DependencyModel {
  const relativePath = path.basename(file.fileName as string);
  const regionEntries: Record<string, RegionEntry> = {};
  const regionsByName: Record<string, string[]> = {};

  regions.forEach(region => {
    const entry: RegionEntry = {
      id: region.id,
      modelId: `${relativePath}:${region.symbol.startLine}`,
      file: relativePath,
      startLine: region.symbol.startLine,
      endLine: region.symbol.endLine,
      name: region.metaData.name as string,
      tags: [],
      refs: [],
      forceRefs: [],
      isGlobal: region.isGlobal(),
    };
    regionEntries[region.id] = entry;
    if (entry.name) {
      regionsByName[entry.name] = [entry.id];
    }
  });

  const fileEntry: FileEntry = {
    path: relativePath,
    checksum: 'x',
    mtime: 0,
    size: 0,
    imports: [],
    regionIds: regions.map(r => r.id),
    hasGlobalRegion: false,
  };

  return {
    version: '1.0',
    generated: new Date().toISOString(),
    rootDir,
    files: { [relativePath]: fileEntry },
    regions: regionEntries,
    regionsByName,
    importGraph: { [relativePath]: [] },
    checksums: { [relativePath]: 'x' },
    mtimes: { [relativePath]: 0 },
  };
}

function createPlan(regionIds: string[]): ExecutionPlan {
  return {
    stages: regionIds.map(id => ({
      units: [
        {
          type: 'region' as const,
          regionIds: [id],
          reason: 'filter_match' as const,
        },
      ],
    })),
    requestedRegionIds: regionIds,
    stats: {
      totalRegions: regionIds.length,
      leafRegions: regionIds.length,
      dependencyRegions: 0,
      forceRefChains: 0,
      requestedRegions: regionIds.length,
    },
  };
}

describe('executePlan', () => {
  it('executes globals once per file and propagates variables', async () => {
    const file = new HttpFile('/tmp/exec.http');
    const region = createHttpRegion(file, 1, 'exec');
    region.execute = jest.fn(async ctx => {
      region.variablesPerEnv[ENVIRONMENT_NONE] = { token: 'abc' };
      ctx.httpRegion = region;
      return true;
    });

    const model = buildModel('/tmp', file, [region]);
    const plan = createPlan([region.id]);

    const createProcessorContext = jest.fn(async (ctx: any) => ({ ...ctx, variables: {}, options: {} }));
    const executeGlobalScripts = jest.fn(async () => true);

    const context: any = {
      variables: {},
      processedHttpRegions: [],
      processedHttpRegionListener: jest.fn(),
      options: {},
    };

    const results = await executePlan(plan, model, [file], context, {}, { createProcessorContext, executeGlobalScripts });

    expect(executeGlobalScripts).toHaveBeenCalledTimes(1);
    expect(region.execute).toHaveBeenCalledTimes(1);
    expect(context.variables.token).toBe('abc');
    expect(context.processedHttpRegionListener).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });

  it('respects resume state by seeking to target and still covers requested regions', async () => {
    const file = new HttpFile('/tmp/resume.http');
    const first = createHttpRegion(file, 1, 'first');
    const second = createHttpRegion(file, 5, 'second');

    first.execute = jest.fn(async () => true);
    second.execute = jest.fn(async () => true);

    const model = buildModel('/tmp', file, [first, second]);
    const plan = createPlan([first.id, second.id]);

    const resumeState: ResumeState = {
      fileName: path.relative(process.cwd(), file.fileName as string),
      line: second.symbol.startLine,
    };

    const context: any = {
      variables: {},
      processedHttpRegions: [],
      processedHttpRegionListener: jest.fn(),
      options: {},
    };

    const results = await executePlan(
      plan,
      model,
      [file],
      context,
      { resumeState },
      { createProcessorContext: async ctx => ({ ...ctx, variables: {}, options: {} }), executeGlobalScripts: async () => true }
    );

    expect(first.execute).not.toHaveBeenCalled();
    expect(second.execute).toHaveBeenCalledTimes(1);
    expect(results.map(r => r.id)).toEqual([second.id]);
  });
});
