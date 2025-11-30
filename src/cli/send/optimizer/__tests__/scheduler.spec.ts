import { computeExecutionPlan } from '../scheduler';
import { DependencyGraph, DependencyModel, DependencyNode, ForceRefChain } from '../types';

function regionId(file: string, line: number) {
  return `${file}_${line}`;
}

function createModel(): { model: DependencyModel; graph: DependencyGraph } {
  const file = 'sample.http';
  const setupId = regionId(file, 0);
  const leafId = regionId(file, 5);
  const extraId = regionId(file, 10);

  const model: DependencyModel = {
    version: '1.0',
    generated: new Date().toISOString(),
    rootDir: '/tmp',
    files: {
      [file]: {
        path: file,
        checksum: 'x',
        mtime: 0,
        size: 0,
        imports: [],
        regionIds: [setupId, leafId, extraId],
        hasGlobalRegion: false,
      },
    },
    regions: {
      [setupId]: {
        id: setupId,
        modelId: `${file}:0`,
        file,
        startLine: 0,
        endLine: 2,
        name: 'setup',
        tags: ['foo'],
        refs: [],
        forceRefs: [],
        isGlobal: false,
      },
      [leafId]: {
        id: leafId,
        modelId: `${file}:5`,
        file,
        startLine: 5,
        endLine: 6,
        name: 'leaf',
        tags: ['foo', 'bar'],
        refs: ['setup'],
        forceRefs: [],
        isGlobal: false,
      },
      [extraId]: {
        id: extraId,
        modelId: `${file}:10`,
        file,
        startLine: 10,
        endLine: 12,
        name: 'other',
        tags: [],
        refs: [],
        forceRefs: [],
        isGlobal: false,
      },
    },
    regionsByName: {
      setup: [setupId],
      leaf: [leafId],
      other: [extraId],
    },
    importGraph: { [file]: [] },
    checksums: { [file]: 'x' },
    mtimes: { [file]: 0 },
  };

  const nodes: Record<string, DependencyNode> = {};
  for (const id of [setupId, leafId, extraId]) {
    nodes[id] = {
      id,
      region: model.regions[id],
      refs: [],
      forceRefs: [],
      dependents: [],
    };
  }
  nodes[leafId].refs.push(nodes[setupId]);
  nodes[setupId].dependents.push(nodes[leafId]);

  const graph: DependencyGraph = { nodes };
  return { model, graph };
}

describe('computeExecutionPlan', () => {
  it('applies filters and includes dependencies', () => {
    const { model, graph } = createModel();
    const plan = computeExecutionPlan(model, graph, [], { filters: { tags: ['foo', 'bar'] } });

    expect(plan.requestedRegionIds).toEqual([regionId('sample.http', 5)]);
    const sequence = plan.stages.flatMap(stage => stage.units.flatMap(unit => unit.regionIds));
    expect(sequence).toEqual([regionId('sample.http', 0), regionId('sample.http', 5)]);
    expect(plan.stats.totalRegions).toBe(2);
  });

  it('applies OR logic for names and AND with tags', () => {
    const { model, graph } = createModel();
    const plan = computeExecutionPlan(model, graph, [], {
      filters: { names: ['leaf', 'other'], tags: ['foo'] },
    });

    expect(plan.requestedRegionIds).toEqual([regionId('sample.http', 5)]);
  });

  it('filters by line range', () => {
    const { model, graph } = createModel();
    const plan = computeExecutionPlan(model, graph, [], {
      filters: { line: 10 },
    });

    expect(plan.requestedRegionIds).toEqual([regionId('sample.http', 10)]);
  });

  it('schedules forceRef chains as single units', () => {
    const { model, graph } = createModel();
    const setupId = regionId('sample.http', 0);
    const leafId = regionId('sample.http', 5);
    const chain: ForceRefChain = { id: 'chain_root', regionIds: [setupId, leafId], softDeps: new Set<string>() };

    const plan = computeExecutionPlan(model, graph, [chain], { filters: { names: ['leaf'] } });

    expect(plan.stages[0].units[0].type).toBe('chain');
    expect(plan.stages[0].units[0].regionIds).toEqual([setupId, leafId]);
    expect(plan.stats.forceRefChains).toBe(1);
  });
});
