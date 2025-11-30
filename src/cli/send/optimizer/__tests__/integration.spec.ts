import fs from 'fs';
import os from 'os';
import path from 'path';

import { ENVIRONMENT_NONE } from '../../../../utils';
import { HttpFile, HttpRegion } from '../../../../store';
import { buildDependencyGraph } from '../graphBuilder';
import { detectForceRefChains } from '../chainDetector';
import { executePlan, countFilesInPlan } from '../executor';
import { computeExecutionPlan } from '../scheduler';
import { buildDependencyModel } from '../staticParser';
import { DependencyModel, ExecutionPlan, RegionEntry } from '../types';

function writeSpec(dir: string, name: string, content: string) {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
  return filePath;
}

function createRuntimeFiles(model: DependencyModel, rootDir: string) {
  const files: Record<string, HttpFile> = {};
  const regionsByFile: Record<string, HttpRegion[]> = {};

  for (const entry of Object.values(model.regions)) {
    const absolute = path.join(rootDir, entry.file);
    const httpFile = files[absolute] || new HttpFile(absolute, rootDir);
    files[absolute] = httpFile;

    const region = new HttpRegion(httpFile, entry.startLine);
    if (entry.name) {
      region.metaData.name = entry.name;
    }
    region.symbol.endLine = entry.endLine;
    region.variablesPerEnv[ENVIRONMENT_NONE] = { [entry.name || entry.id]: entry.name || entry.id };
    region.execute = jest.fn(async ctx => {
      ctx.httpRegion = region;
      return true;
    });
    regionsByFile[absolute] = regionsByFile[absolute] || [];
    regionsByFile[absolute].push(region);
  }

  Object.entries(regionsByFile).forEach(([, regions]) => {
    regions.sort((a, b) => a.symbol.startLine - b.symbol.startLine);
  });

  Object.values(files).forEach(file => {
    file.httpRegions.push(...(regionsByFile[file.fileName as string] || []));
  });

  return Object.values(files);
}

function planFromModel(model: DependencyModel, names: string[]): ExecutionPlan {
  const graph = buildDependencyGraph(model);
  const chains = detectForceRefChains(graph);
  return computeExecutionPlan(model, graph, chains, { filters: { names } });
}

describe('optimizer integration', () => {
  it('builds plan with collapsed forceRef chains and executes in order', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uctest-int-'));
    try {
      writeSpec(
        dir,
        'flow.http',
        `
# @name refTarget
GET https://example.test/a
### @name mid
# @forceRef refTarget
GET https://example.test/b
### @name leaf
# @ref mid
GET https://example.test/c
`
      );

      const model = await buildDependencyModel(dir);
      const plan = planFromModel(model, ['leaf']);
      expect(plan.stats.totalRegions).toBe(3);
      expect(plan.requestedRegionIds.length).toBe(1);
      expect(countFilesInPlan(plan, model)).toBe(1);

      const httpFiles = createRuntimeFiles(model, dir);
      const context: any = {
        variables: {},
        processedHttpRegions: [],
        processedHttpRegionListener: jest.fn(),
        options: {},
      };

      const results = await executePlan(
        plan,
        model,
        httpFiles,
        context,
        {},
        { createProcessorContext: async ctx => ({ ...ctx, variables: {}, options: {} }), executeGlobalScripts: async () => true }
      );

      const executedOrder = results.map(r => (r.metaData?.name as string) || r.id);
      expect(executedOrder).toEqual(['refTarget', 'mid', 'leaf']);
      expect(context.processedHttpRegionListener).toHaveBeenCalledTimes(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
