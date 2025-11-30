import path from 'path';

import * as models from '../../../models';
import { createEmptyProcessorContext } from '../../../httpYacApi';
import * as utils from '../../../utils';
import { DependencyModel, ExecutionPlan, ResumeState } from './types';

export interface ExecuteOptions {
  resumeState?: ResumeState;
  showPlan?: boolean;
}

export interface ExecutionRuntime {
  createProcessorContext: typeof createEmptyProcessorContext;
  executeGlobalScripts: typeof utils.executeGlobalScripts;
}

const defaultRuntime: ExecutionRuntime = {
  createProcessorContext: createEmptyProcessorContext,
  executeGlobalScripts: utils.executeGlobalScripts,
};

export async function executePlan(
  plan: ExecutionPlan,
  model: DependencyModel,
  httpFiles: Array<models.HttpFile>,
  context: Omit<models.HttpFileSendContext, 'httpFile'> & { options?: Record<string, unknown> },
  options: ExecuteOptions = {},
  runtime: ExecutionRuntime = defaultRuntime
): Promise<models.ProcessedHttpRegion[]> {
  if (options.showPlan) {
    printPlan(plan, model);
    return [];
  }

  const processed: models.ProcessedHttpRegion[] = context.processedHttpRegions || [];
  context.processedHttpRegions = processed;

  const regionLookup = buildRegionLookup(httpFiles, model);
  const httpFileByPath = buildFileLookup(httpFiles, model.rootDir);
  const executedGlobals = new Set<string>();
  const executedRegions = new Set<string>();
  const printedFileHeaders = new Set<string>();
  const results: models.ProcessedHttpRegion[] = [];
  let seeking = !!options.resumeState;

  for (const stage of plan.stages) {
    for (const unit of stage.units) {
      for (const regionId of unit.regionIds) {
        const mapping = regionLookup.get(regionId);
        if (!mapping) {
          throw new Error(`Region ${regionId} not found in loaded http files`);
        }

        if (seeking) {
          if (options.resumeState && matchesResumeTarget(mapping.httpRegion, mapping.httpFile, options.resumeState)) {
            seeking = false;
        } else {
          executedRegions.add(regionId);
          continue;
        }
      }

        // Print file header (matching normal execution path output)
        const fileName = mapping.httpFile.fileName;
        const fileKey = typeof fileName === 'string' ? fileName : fileName?.toString?.() || '';
        if (!printedFileHeaders.has(fileKey) && (context as any).scriptConsole) {
          (context as any).scriptConsole.info(`--------------------- ${fileKey}  --`);
          printedFileHeaders.add(fileKey);
        }

        await executeGlobalsForFile(mapping.entry.file, model, httpFileByPath, context, runtime, executedGlobals);

        const processorContext: models.ProcessorContext = {
          ...(context as models.ProcessorContext),
          httpFile: mapping.httpFile,
          httpRegion: mapping.httpRegion,
          variables: context.variables || {},
          options: context.options || {},
          // Explicitly preserve logging fields that may be lost in type casting
          scriptConsole: (context as any).scriptConsole,
          logResponse: (context as any).logResponse,
          logStream: (context as any).logStream,
        };

        const start = performance.now();
        const beforeCount = processed.length;
        const ok = await mapping.httpRegion.execute(processorContext, true);
        executedRegions.add(regionId);

        propagateVariables(mapping.httpRegion, processorContext);
        const afterCount = processed.length;
        let processedRegion: models.ProcessedHttpRegion;
        if (afterCount > beforeCount) {
          processedRegion = processed[afterCount - 1];
        } else {
          processedRegion = toProcessedHttpRegion(mapping.httpRegion, mapping.httpFile, start);
          processed.push(processedRegion);
          context.processedHttpRegionListener?.(processedRegion);
        }
        results.push(processedRegion);

        if (!ok) {
          return results;
        }
      }
    }
  }

  assertRequestedExecuted(plan, executedRegions);
  return results;
}

function propagateVariables(httpRegion: models.HttpRegion, context: models.ProcessorContext) {
  const envKey = utils.toEnvironmentKey(context.activeEnvironment);
  const variables = httpRegion.variablesPerEnv[envKey];
  if (variables) {
    utils.setVariableInContext(variables, context);
  }
}

function toProcessedHttpRegion(
  httpRegion: models.HttpRegion,
  httpFile: models.HttpFile,
  start: number
): models.ProcessedHttpRegion {
  const end = performance.now();
  return {
    id: httpRegion.id,
    filename: httpFile.fileName,
    symbol: httpRegion.symbol,
    isGlobal: httpRegion.isGlobal(),
    metaData: { ...httpRegion.metaData },
    testResults: httpRegion.testResults,
    request: httpRegion.response?.request,
    response: httpRegion.response,
    start,
    end,
    duration: end - start,
  };
}

function buildRegionLookup(
  httpFiles: Array<models.HttpFile>,
  model: DependencyModel
): Map<string, { httpRegion: models.HttpRegion; httpFile: models.HttpFile; entry: DependencyModel['regions'][string] }> {
  const map = new Map<string, { httpRegion: models.HttpRegion; httpFile: models.HttpFile; entry: DependencyModel['regions'][string] }>();

  for (const httpFile of httpFiles) {
    for (const region of httpFile.httpRegions) {
      const entry = model.regions[region.id];
      if (entry) {
        map.set(region.id, { httpRegion: region, httpFile, entry });
      }
    }
  }

  return map;
}

function buildFileLookup(httpFiles: Array<models.HttpFile>, rootDir: string) {
  const map = new Map<string, models.HttpFile>();
  for (const httpFile of httpFiles) {
    const normalized = normalizeToModelPath(httpFile.fileName, rootDir);
    if (normalized) {
      map.set(normalized, httpFile);
    }
  }
  return map;
}

async function executeGlobalsForFile(
  filePath: string,
  model: DependencyModel,
  httpFileByPath: Map<string, models.HttpFile>,
  context: Omit<models.HttpFileSendContext, 'httpFile'> & { options?: Record<string, unknown> },
  runtime: ExecutionRuntime,
  executedGlobals: Set<string>
) {
  if (executedGlobals.has(filePath)) {
    return;
  }

  const imports = model.importGraph[filePath] || [];
  for (const imp of imports) {
    await executeGlobalsForFile(imp, model, httpFileByPath, context, runtime, executedGlobals);
  }

  const httpFile = httpFileByPath.get(filePath);
  if (!httpFile) {
    throw new Error(`HTTP file not loaded for ${filePath}`);
  }

  // DON'T use createProcessorContext - it reloads .env and overwrites parent variables!
  // Instead, create a minimal context that INHERITS the parent's variables.
  // This ensures imported files (like common.http) receive the importer's environment.
  const fileContext: models.ProcessorContext = {
    ...(context as models.ProcessorContext),
    httpFile,
    httpRegion: httpFile.httpRegions[0] || ({} as models.HttpRegion), // Placeholder for global context
    variables: context.variables || {}, // INHERIT parent variables - don't reload .env
    options: context.options || {},
    processedHttpRegions: [],
  };

  await runtime.executeGlobalScripts(fileContext);
  const envKey = utils.toEnvironmentKey(context.activeEnvironment);
  try {
    if (Array.isArray(httpFile.globalHttpRegions)) {
      for (const region of httpFile.globalHttpRegions) {
        const vars = region?.variablesPerEnv?.[envKey];
        if (vars) {
          utils.setVariableInContext(vars, context as models.ProcessorContext);
        }
      }
    }
  } catch (err) {
    // Ignore variable propagation issues from globals; execution will proceed with already merged variables
  }
  // Propagate any new variables set by the globals back to the parent context
  if (fileContext.variables) {
    context.variables = {
      ...(context.variables || {}),
      ...fileContext.variables,
    };
  }
  executedGlobals.add(filePath);
}

function matchesResumeTarget(region: models.HttpRegion, httpFile: models.HttpFile, resume: ResumeState): boolean {
  const fileName = normalizeFileName(httpFile);
  if (!fileName || fileName !== resume.fileName) {
    return false;
  }
  return region.symbol.startLine === resume.line;
}

function normalizeFileName(httpFile: models.HttpFile) {
  const fsPath =
    typeof httpFile.fileName === 'string'
      ? httpFile.fileName
      : httpFile.fileName && 'toString' in httpFile.fileName
        ? httpFile.fileName.toString()
        : undefined;
  if (!fsPath) {
    return undefined;
  }
  return path.isAbsolute(fsPath) ? path.relative(process.cwd(), fsPath) : fsPath;
}

function normalizeToModelPath(fileName: models.PathLike | undefined, rootDir: string): string | undefined {
  if (!fileName) {
    return undefined;
  }
  const fsPath =
    typeof fileName === 'string'
      ? fileName
      : fileName && 'toString' in fileName
        ? fileName.toString()
        : undefined;
  if (!fsPath) {
    return undefined;
  }
  const relPath = path.isAbsolute(fsPath) ? path.relative(rootDir, fsPath) : fsPath;
  return relPath.split(path.sep).join('/');
}

export function countFilesInPlan(plan: ExecutionPlan, model: DependencyModel): number {
  const ids = new Set<string>();
  for (const stage of plan.stages) {
    for (const unit of stage.units) {
      for (const id of unit.regionIds) {
        const region = model.regions[id];
        if (region) {
          ids.add(region.file);
        }
      }
    }
  }
  return ids.size;
}

export function assertRequestedExecuted(plan: ExecutionPlan, executed: Set<string>) {
  const missing = plan.requestedRegionIds.filter(id => !executed.has(id));
  if (missing.length > 0) {
    throw new Error(`Execution coverage failed. Missing requested regions: ${missing.join(', ')}`);
  }
}

function printPlan(plan: ExecutionPlan, model: DependencyModel) {
  // Basic printable plan for --show-plan
  const lines: string[] = [];
  lines.push('Execution Plan:');
  plan.stages.forEach((stage, index) => {
    for (const unit of stage.units) {
      const label = unit.type === 'chain' ? 'chain' : 'region';
      const names = unit.regionIds
        .map(id => model.regions[id]?.name || id)
        .join(' \u2192 ');
      lines.push(`  Stage ${index + 1}: [${label}] ${names} (reason: ${unit.reason})`);
    }
  });
  lines.push(`Total: ${plan.stats.totalRegions} requests`);
  // eslint-disable-next-line no-console
  console.info(lines.join('\n'));
}
