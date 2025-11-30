import { loadCache, saveCache, validateCache } from './cache';
import { buildDependencyModel, StaticParserOptions } from './staticParser';
import { DependencyModel } from './types';

export * from './cache';
export * from './chainDetector';
export * from './executor';
export * from './graphBuilder';
export * from './scheduler';
export * from './staticParser';
export * from './types';

export interface ModelOptions extends StaticParserOptions {
  noCache?: boolean;
}

export async function loadOrBuildModel(rootDir: string, options: ModelOptions = {}): Promise<DependencyModel> {
  if (!options.noCache) {
    const cached = await loadCache(rootDir);
    if (cached) {
      const validation = await validateCache(cached, rootDir);
      if (validation.valid) {
        return cached;
      }
    }
  }

  const model = await buildDependencyModel(rootDir, options);

  if (!options.noCache) {
    await saveCache(rootDir, model);
  }

  return model;
}
