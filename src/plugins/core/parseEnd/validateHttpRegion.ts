import { log } from '../../../io';
import * as models from '../../../models';

/**
 * Validates an HttpRegion for common authoring mistakes that could cause
 * runtime issues like infinite loops or confusing behavior.
 */
export async function validateHttpRegion(context: models.ParserContext): Promise<void> {
  const { httpRegion, httpFile } = context;
  const { metaData } = httpRegion;

  // Check for self-reference (name + ref/forceRef to same name)
  validateNoSelfReference(metaData);

  // Check for circular references within the file scope
  // This is a best-effort check - cross-file cycles are caught at runtime
  validateNoCircularReferences(httpRegion, httpFile);
}

/**
 * Detects when a region has both @name and @ref/@forceRef pointing to the same name.
 * This creates an infinite loop where a request references itself.
 *
 * Example of the bug:
 * ```http
 * # @name foo
 * # @forceRef foo    <- This is a self-reference!
 * GET /api/endpoint
 * ```
 */
function validateNoSelfReference(metaData: Record<string, string | undefined | true>): void {
  const name = metaData.name;
  if (typeof name !== 'string') {
    return;
  }

  const refs = getRefsFromMetaData(metaData);

  for (const ref of refs) {
    if (ref === name) {
      const msg = `Self-reference detected: region named "${name}" has @ref/@forceRef to itself. ` +
        `This causes an infinite loop. Check for missing ### separator between requests.`;
      log.error(msg);
      throw new Error(msg);
    }
  }
}

/**
 * Detects circular reference chains within a single file.
 * For example: A -> B -> C -> A
 *
 * This is a best-effort check at parse time. Cross-file cycles and
 * dynamic references are caught at runtime by the depth guard in refMetaDataHandler.
 */
function validateNoCircularReferences(currentRegion: models.HttpRegion, httpFile: models.HttpFile): void {
  const currentName = currentRegion.metaData.name;
  if (typeof currentName !== 'string') {
    return;
  }

  const refs = getRefsFromMetaData(currentRegion.metaData);
  if (refs.length === 0) {
    return;
  }

  // Build a map of all named regions we've seen so far (including this one)
  const nameToRefs = new Map<string, string[]>();

  // Add already-parsed regions
  for (const region of httpFile.httpRegions) {
    const name = region.metaData.name;
    if (typeof name === 'string') {
      nameToRefs.set(name, getRefsFromMetaData(region.metaData));
    }
  }

  // Add current region (not yet in httpRegions array)
  nameToRefs.set(currentName, refs);

  // Check for cycles starting from the current region
  const visited = new Set<string>();
  const path: string[] = [];

  function detectCycle(name: string): string[] | null {
    if (path.includes(name)) {
      // Found a cycle - return the path from the cycle start
      const cycleStart = path.indexOf(name);
      return [...path.slice(cycleStart), name];
    }

    if (visited.has(name)) {
      return null;
    }

    visited.add(name);
    path.push(name);

    const regionRefs = nameToRefs.get(name);
    if (regionRefs) {
      for (const ref of regionRefs) {
        const cycle = detectCycle(ref);
        if (cycle) {
          return cycle;
        }
      }
    }

    path.pop();
    return null;
  }

  const cycle = detectCycle(currentName);
  if (cycle) {
    const cycleStr = cycle.join(' -> ');
    const msg = `Circular reference detected: ${cycleStr}. ` +
      `This will cause an infinite loop at runtime.`;
    log.error(msg);
    throw new Error(msg);
  }
}

/**
 * Extracts all ref and forceRef values from metadata.
 */
function getRefsFromMetaData(metaData: Record<string, string | undefined | true>): string[] {
  const refs: string[] = [];
  if (typeof metaData.ref === 'string') {
    refs.push(...metaData.ref.split(/\s*,\s*/));
  }
  if (typeof metaData.forceRef === 'string') {
    refs.push(...metaData.forceRef.split(/\s*,\s*/));
  }
  return refs;
}
