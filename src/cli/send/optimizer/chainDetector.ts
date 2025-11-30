import { DependencyGraph, DependencyNode, ForceRefChain } from './types';

export function detectForceRefChains(graph: DependencyGraph): ForceRefChain[] {
  const chains: ForceRefChain[] = [];
  const visited = new Set<string>();
  const leaves = findChainLeaves(graph);

  for (const leaf of leaves) {
    if (visited.has(leaf.id)) {
      continue;
    }

    const chain: string[] = [];
    const softDeps = new Set<string>();
    let hasBranchingTarget = false;
    let current: DependencyNode | undefined = leaf;

    while (current) {
      chain.unshift(current.id);
      visited.add(current.id);

      current.refs.forEach(ref => softDeps.add(ref.id));

      if (current.forceRefs.length === 0) {
        break;
      }
      if (current.forceRefs.length > 1) {
        current.forceRefs.forEach(ref => softDeps.add(ref.id));
        hasBranchingTarget = true;
        break;
      }
      current = current.forceRefs[0];
    }

    if (!hasBranchingTarget && chain.length > 1) {
      chains.push({ id: `chain_${chain[0]}`, regionIds: chain, softDeps });
    }
  }

  return mergeOverlappingChains(chains);
}

function findChainLeaves(graph: DependencyGraph): DependencyNode[] {
  const leaves: DependencyNode[] = [];
  const forceRefDependents = new Map<string, number>();

  for (const node of Object.values(graph.nodes)) {
    for (const target of node.forceRefs) {
      forceRefDependents.set(target.id, (forceRefDependents.get(target.id) || 0) + 1);
    }
  }

  for (const node of Object.values(graph.nodes)) {
    if (node.forceRefs.length > 0 && !forceRefDependents.has(node.id)) {
      leaves.push(node);
    }
  }

  return leaves;
}

function mergeOverlappingChains(chains: ForceRefChain[]): ForceRefChain[] {
  const result: ForceRefChain[] = [];
  const sorted = chains.sort(
    (a, b) => b.regionIds.length - a.regionIds.length || a.id.localeCompare(b.id)
  );

  for (const chain of sorted) {
    const superset = result.find(existing => isSuperset(existing.regionIds, chain.regionIds));
    if (superset) {
      chain.softDeps.forEach(dep => superset.softDeps.add(dep));
      continue;
    }
    result.push(chain);
  }

  return result;
}

function isSuperset(existing: string[], candidate: string[]): boolean {
  if (existing.length < candidate.length) {
    return false;
  }
  return candidate.every((id, index) => existing[index] === id);
}
