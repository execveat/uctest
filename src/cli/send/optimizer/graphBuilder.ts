import { DependencyGraph, DependencyModel, DependencyNode, RegionEntry } from './types';

export interface ResolveOptions {
  filters?: {
    tags?: string[];
    names?: string[];
    line?: number;
  };
}

export function buildDependencyGraph(model: DependencyModel): DependencyGraph {
  const nodes: Record<string, DependencyNode> = {};

  Object.values(model.regions).forEach(region => {
    nodes[region.id] = buildNode(region);
  });

  for (const node of Object.values(nodes)) {
    const region = node.region;
    for (const refName of region.refs) {
      const target = resolveRefByName(refName, region.file, model);
      if (!target) {
        throw new Error(`ref "${refName}" not found in scope ${region.file}`);
      }
      const targetNode = nodes[target.id];
      node.refs.push(targetNode);
      targetNode.dependents.push(node);
    }

    for (const refName of region.forceRefs) {
      const target = resolveRefByName(refName, region.file, model);
      if (!target) {
        throw new Error(`ref "${refName}" not found in scope ${region.file}`);
      }
      const targetNode = nodes[target.id];
      node.forceRefs.push(targetNode);
      targetNode.dependents.push(node);
    }
  }

  detectCycles(nodes);
  return { nodes };
}

export function resolveRefByName(name: string, fromFile: string, model: DependencyModel): RegionEntry | null {
  const visibleFiles = getVisibleFiles(fromFile, model);

  const matches: RegionEntry[] = [];
  for (const file of visibleFiles) {
    const fileEntry = model.files[file];
    if (!fileEntry) {
      continue;
    }
    for (const regionId of fileEntry.regionIds) {
      const region = model.regions[regionId];
      if (region?.name === name) {
        matches.push(region);
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous reference "${name}" in scope ${fromFile}: ${matches
        .map(r => `${r.file}:${r.startLine}`)
        .join(', ')}`
    );
  }
  return matches[0];
}

export function getVisibleFiles(fromFile: string, model: DependencyModel): string[] {
  const result = [fromFile];
  const queue = [fromFile];
  const visited = new Set<string>([fromFile]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const imports = model.importGraph[current] || [];
    for (const imp of imports) {
      if (!visited.has(imp)) {
        visited.add(imp);
        result.push(imp);
        queue.push(imp);
      }
    }
  }

  return result;
}

export function buildNode(region: RegionEntry): DependencyNode {
  return {
    id: region.id,
    region,
    refs: [],
    forceRefs: [],
    dependents: [],
  };
}

function detectCycles(nodes: Record<string, DependencyNode>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const walk = (node: DependencyNode, path: string[]) => {
    if (visited.has(node.id)) {
      return;
    }
    if (visiting.has(node.id)) {
      const cycleStart = path.indexOf(node.id);
      const cyclePath = [...path.slice(cycleStart), node.id];
      throw new Error(`Circular reference: ${cyclePath.join(' → ')}`);
    }
    visiting.add(node.id);
    const nextPath = [...path, node.id];
    for (const child of [...node.refs, ...node.forceRefs]) {
      walk(child, nextPath);
    }
    visiting.delete(node.id);
    visited.add(node.id);
  };

  Object.values(nodes).forEach(node => walk(node, []));
}
