import { DependencyGraph, DependencyModel, ExecutionPlan, ExecutionStage, ForceRefChain, SchedulerFilters } from './types';

export interface PlanOptions {
  filters?: SchedulerFilters;
  selection?: string[];
}

export function computeExecutionPlan(
  model: DependencyModel,
  graph: DependencyGraph,
  chains: ForceRefChain[],
  options: PlanOptions = {}
): ExecutionPlan {
  const requestedRegionIds = collectRequestedRegions(model, options);
  const requestedSet = new Set(requestedRegionIds);

  const requiredRegions = expandDependencies(requestedSet, graph, chains);
  let selectedChains = selectRelevantChains(requiredRegions, chains);
  selectedChains.forEach(chain => chain.regionIds.forEach(id => requiredRegions.add(id)));

  // Include soft deps of selected chains
  selectedChains.forEach(chain => chain.softDeps.forEach(dep => requiredRegions.add(dep)));

  let units = buildUnits(model, requiredRegions, requestedSet, selectedChains);
  let stages: ExecutionStage[];

  try {
    stages = topoSchedule(units, graph, selectedChains);
  } catch (err) {
    if (isCycleError(err)) {
      // Fallback: retry without chain collapsing to guarantee execution order
      selectedChains = [];
      units = buildUnits(model, requiredRegions, requestedSet, selectedChains);
      stages = topoSchedule(units, graph, selectedChains);
    } else {
      throw err;
    }
  }

  const totalRegions = units.reduce((acc, unit) => acc + unit.regionIds.length, 0);
  const leafRegions = units.filter(unit => unit.reason === 'filter_match').length;
  const forceRefChains = units.filter(unit => unit.type === 'chain').length;
  const dependencyRegions = units.length - leafRegions - forceRefChains;

  return {
    stages,
    requestedRegionIds,
    stats: {
      totalRegions,
      leafRegions,
      dependencyRegions,
      forceRefChains,
      requestedRegions: requestedRegionIds.length,
    },
  };
}

function collectRequestedRegions(model: DependencyModel, options: PlanOptions): string[] {
  if (options.selection && options.selection.length > 0) {
    return options.selection
      .map(id => model.regions[id])
      .filter((region): region is DependencyModel['regions'][string] => !!region && !region.isGlobal)
      .map(region => region.id);
  }

  const filters = options.filters || {};
  const requested: string[] = [];
  const files = Object.values(model.files);
  for (const file of files) {
    for (const regionId of file.regionIds) {
      const region = model.regions[regionId];
      if (!region || region.isGlobal) {
        continue;
      }
      if (matchesFilters(region, filters)) {
        requested.push(region.id);
      }
    }
  }

  if (requested.length === 0 && !hasFilters(filters)) {
    // No filters means all non-global regions are requested
    for (const file of files) {
      for (const regionId of file.regionIds) {
        const region = model.regions[regionId];
        if (region && !region.isGlobal) {
          requested.push(region.id);
        }
      }
    }
  }

  return requested;
}

function hasFilters(filters: SchedulerFilters) {
  return !!(
    (filters.tags && filters.tags.length > 0) ||
    (filters.names && filters.names.length > 0) ||
    filters.line !== undefined
  );
}

function matchesFilters(region: DependencyModel['regions'][string], filters: SchedulerFilters) {
  if (filters.tags && filters.tags.length > 0) {
    if (!filters.tags.every(tag => region.tags.includes(tag))) {
      return false;
    }
  }
  if (filters.names && filters.names.length > 0) {
    if (!region.name || !filters.names.includes(region.name)) {
      return false;
    }
  }
  if (typeof filters.line === 'number') {
    if (filters.line < region.startLine || filters.line > region.endLine) {
      return false;
    }
  }
  return true;
}

function expandDependencies(
  requested: Set<string>,
  graph: DependencyGraph,
  chains: ForceRefChain[]
): Set<string> {
  const required = new Set<string>();
  const queue: string[] = [...requested];

  const chainRegionIds = new Set<string>();
  chains.forEach(chain => chain.regionIds.forEach(id => chainRegionIds.add(id)));

  while (queue.length > 0) {
    const regionId = queue.pop()!;
    if (required.has(regionId)) {
      continue;
    }
    required.add(regionId);
    const node = graph.nodes[regionId];
    if (!node) {
      continue;
    }
    node.refs.forEach(ref => {
      if (!required.has(ref.id)) {
        queue.push(ref.id);
      }
    });
    node.forceRefs.forEach(force => {
      if (!required.has(force.id)) {
        queue.push(force.id);
      }
    });
  }

  const queueSoft: string[] = [];

  // Ensure any chain covering a required region pulls in full chain and soft deps
  for (const chain of chains) {
    if (chain.regionIds.some(id => required.has(id))) {
      chain.regionIds.forEach(id => required.add(id));
      chain.softDeps.forEach(dep => {
        if (!required.has(dep)) {
          required.add(dep);
          queueSoft.push(dep);
        }
      });
    }
  }

  while (queueSoft.length > 0) {
    const regionId = queueSoft.pop()!;
    const node = graph.nodes[regionId];
    if (!node) {
      continue;
    }
    node.refs.forEach(ref => {
      if (!required.has(ref.id)) {
        required.add(ref.id);
        queueSoft.push(ref.id);
      }
    });
    node.forceRefs.forEach(force => {
      if (!required.has(force.id)) {
        required.add(force.id);
        queueSoft.push(force.id);
      }
    });
  }

  return required;
}

function selectRelevantChains(requiredRegions: Set<string>, chains: ForceRefChain[]): ForceRefChain[] {
  return chains.filter(chain => chain.regionIds.some(id => requiredRegions.has(id)));
}

function buildUnits(
  model: DependencyModel,
  requiredRegions: Set<string>,
  requestedRegions: Set<string>,
  chains: ForceRefChain[]
) {
  const units: {
    id: string;
    type: 'region' | 'chain';
    regionIds: string[];
    reason: 'filter_match' | 'ref_dependency' | 'forceRef_chain';
  }[] = [];

  const coveredByChain = new Set<string>();

  for (const chain of chains) {
    const reason: 'forceRef_chain' | 'ref_dependency' = 'forceRef_chain';
    units.push({
      id: chain.id,
      type: 'chain',
      regionIds: chain.regionIds,
      reason,
    });
    chain.regionIds.forEach(id => coveredByChain.add(id));
  }

  requiredRegions.forEach(regionId => {
    if (coveredByChain.has(regionId)) {
      return;
    }
    const region = model.regions[regionId];
    if (!region) {
      return;
    }
    const reason: 'filter_match' | 'ref_dependency' = requestedRegions.has(regionId)
      ? 'filter_match'
      : 'ref_dependency';
    units.push({
      id: regionId,
      type: 'region',
      regionIds: [regionId],
      reason,
    });
  });

  // Deterministic order for topo
  units.sort((a, b) => a.id.localeCompare(b.id));
  return units;
}

function mapRegionsToChains(chains: ForceRefChain[]): Map<string, ForceRefChain> {
  const map = new Map<string, ForceRefChain>();
  const sorted = chains.slice().sort(
    (a, b) => b.regionIds.length - a.regionIds.length || a.id.localeCompare(b.id)
  );
  for (const chain of sorted) {
    for (const regionId of chain.regionIds) {
      if (!map.has(regionId)) {
        map.set(regionId, chain);
      }
    }
  }
  return map;
}

function topoSchedule(
  units: Array<{
    id: string;
    type: 'region' | 'chain';
    regionIds: string[];
    reason: 'filter_match' | 'ref_dependency' | 'forceRef_chain';
  }>,
  graph: DependencyGraph,
  chains: ForceRefChain[]
): ExecutionStage[] {
  const unitById = new Map(units.map(unit => [unit.id, unit]));
  const regionToUnit = buildRegionToUnit(units, chains);
  const edges = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const unit of units) {
    edges.set(unit.id, new Set());
    indegree.set(unit.id, 0);
  }

  const addEdge = (from: string, to: string) => {
    if (from === to) {
      return;
    }
    const targets = edges.get(from);
    if (!targets) {
      return;
    }
    if (!targets.has(to)) {
      targets.add(to);
      indegree.set(to, (indegree.get(to) || 0) + 1);
    }
  };

  for (const unit of units) {
    for (const regionId of unit.regionIds) {
      const node = graph.nodes[regionId];
      if (!node) {
        continue;
      }
      const dependencies = [...node.refs.map(ref => ref.id), ...node.forceRefs.map(ref => ref.id)];
      dependencies.forEach(dep => {
        const fromUnit = regionToUnit.get(dep);
        const toUnit = regionToUnit.get(regionId);
        if (fromUnit && toUnit) {
          addEdge(fromUnit, toUnit);
        }
      });
    }
    if (unit.type === 'chain') {
      const chain = chains.find(c => c.id === unit.id);
      chain?.softDeps.forEach(dep => {
        const fromUnit = regionToUnit.get(dep);
        if (fromUnit) {
          addEdge(fromUnit, unit.id);
        }
      });
    }
  }

  const queue: string[] = [];
  indegree.forEach((value, key) => {
    if (value === 0) {
      queue.push(key);
    }
  });
  queue.sort();

  const stages: ExecutionStage[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const unit = unitById.get(current);
    if (!unit) {
      continue;
    }
    stages.push({ units: [unit] });

    const outgoing = edges.get(current);
    if (outgoing) {
      outgoing.forEach(target => {
        const nextIn = (indegree.get(target) || 0) - 1;
        indegree.set(target, nextIn);
        if (nextIn === 0) {
          queue.push(target);
          queue.sort();
        }
      });
    }
  }

  if (stages.length !== units.length) {
    const remaining = units
      .map(unit => ({ unit, indegree: indegree.get(unit.id) || 0 }))
      .filter(entry => entry.indegree > 0)
      .map(entry => `${entry.unit.id}(${entry.indegree})`);
    const fallback = units
      .filter(unit => !remaining.some(entry => entry.startsWith(unit.id)))
      .map(unit => unit.id);
    const details = [...remaining, ...fallback].join(', ');
    throw new Error(`Circular reference detected in execution plan. Remaining: ${details}`);
  }

  return stages;
}

function buildRegionToUnit(
  units: Array<{
    id: string;
    type: 'region' | 'chain';
    regionIds: string[];
    reason: 'filter_match' | 'ref_dependency' | 'forceRef_chain';
  }>,
  chains: ForceRefChain[]
): Map<string, string> {
  const map = new Map<string, string>();
  const chainMap = mapRegionsToChains(chains);
  for (const unit of units) {
    for (const regionId of unit.regionIds) {
      if (unit.type === 'chain') {
        map.set(regionId, unit.id);
      } else {
        const chain = chainMap.get(regionId);
        map.set(regionId, chain ? chain.id : unit.id);
      }
    }
  }
  return map;
}

function isCycleError(err: unknown): err is Error {
  return err instanceof Error && err.message.startsWith('Circular reference detected in execution plan');
}
