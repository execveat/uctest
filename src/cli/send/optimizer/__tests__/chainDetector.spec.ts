import { detectForceRefChains } from '../chainDetector';
import { DependencyGraph, DependencyNode, RegionEntry } from '../types';

function createRegion(id: string): RegionEntry {
  return {
    id,
    modelId: id,
    file: 'sample.http',
    startLine: 0,
    endLine: 0,
    tags: [],
    refs: [],
    forceRefs: [],
    isGlobal: false,
  };
}

function createNode(id: string): DependencyNode {
  const region = createRegion(id);
  return {
    id,
    region,
    refs: [],
    forceRefs: [],
    dependents: [],
  };
}

function linkForceRef(from: DependencyNode, to: DependencyNode) {
  from.forceRefs.push(to);
  to.dependents.push(from);
}

describe('detectForceRefChains', () => {
  it('collapses linear chains and collects soft deps', () => {
    const root = createNode('root');
    const mid = createNode('mid');
    const leaf = createNode('leaf');
    const soft = createNode('soft');

    mid.refs.push(soft);
    leaf.refs.push(root);

    linkForceRef(mid, root);
    linkForceRef(leaf, mid);

    const graph: DependencyGraph = {
      nodes: {
        root,
        mid,
        leaf,
        soft,
      },
    };

    const chains = detectForceRefChains(graph);
    expect(chains).toHaveLength(1);
    expect(chains[0].regionIds).toEqual(['root', 'mid', 'leaf']);
    expect(Array.from(chains[0].softDeps)).toEqual(expect.arrayContaining(['soft', 'root']));
  });

  it('keeps branching dependents as separate chains', () => {
    const target = createNode('target');
    const left = createNode('left');
    const right = createNode('right');

    linkForceRef(left, target);
    linkForceRef(right, target);

    const graph: DependencyGraph = {
      nodes: {
        target,
        left,
        right,
      },
    };

    const chains = detectForceRefChains(graph);
    const sequences = chains.map(chain => chain.regionIds);
    expect(sequences).toContainEqual(['target', 'left']);
    expect(sequences).toContainEqual(['target', 'right']);
  });

  it('merges overlapping chains preferring longer sequences', () => {
    const base = createNode('base');
    const mid = createNode('mid');
    const tail = createNode('tail');
    const alt = createNode('alt');

    linkForceRef(mid, base);
    linkForceRef(tail, mid);
    linkForceRef(alt, mid);

    const graph: DependencyGraph = {
      nodes: { base, mid, tail, alt },
    };

    const chains = detectForceRefChains(graph);
    // One of the chains should keep base → mid → tail, the overlapping shorter chain (base → mid) is merged away.
    const lengths = chains.map(c => c.regionIds.length).sort();
    expect(lengths[lengths.length - 1]).toBe(3);
  });

  it('ignores chain collapsing when a region has multiple forceRef targets', () => {
    const targetA = createNode('targetA');
    const targetB = createNode('targetB');
    const leaf = createNode('leaf');

    linkForceRef(leaf, targetA);
    linkForceRef(leaf, targetB);

    const graph: DependencyGraph = {
      nodes: { targetA, targetB, leaf },
    };

    const chains = detectForceRefChains(graph);
    expect(chains).toHaveLength(0);
  });
});
