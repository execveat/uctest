import { default as chalk } from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import type { Options } from 'globby';
import { isAbsolute, join, parse, relative, sep, resolve } from 'path';

import { send } from '../../httpYacApi';
import { Logger, fileProvider } from '../../io';
import * as models from '../../models';
import { HttpFileStore } from '../../store';
import * as utils from '../../utils';
import { toSendJsonOutput, toSendOutputRequest } from './jsonOutput';
import {
  buildDependencyGraph,
  computeExecutionPlan,
  countFilesInPlan,
  detectForceRefChains,
  executePlan as executeOptimizedPlan,
  type DependencyModel,
  type ExecutionPlan,
  loadOrBuildModel,
} from './optimizer';
import { getLogLevel, OutputType, SendOptions } from './options';
import { createCliPluginRegister } from './plugin';
import { SelectActionResult, selectHttpFiles } from './selectHttpFiles';
import { createEmptyProcessorContext } from '../../httpYacApi';

export function sendCommand() {
  const program = new Command('uctest')
    .description('HTTP test runner for Unsafe Code Lab')
    .usage('[@tag...] [:name...] [path...] [options]')
    .argument('[args...]', 'Tags (@tag), names (:name), and paths')
    .option('-k, --keep-going', 'continue running after failures (default: stop on first)')
    .option('--json', 'use json output')
    .option('--jsonl', 'stream json lines output')
    .option('-l, --line <line>', 'line of the http requests', utils.toNumber)
    .option('--no-color', 'disable color support')
    .option('-o, --output <output>', 'output format of response (short, body, headers, response, exchange, none)', 'none')
    .option(
      '--output-failed <output>',
      'output format of failed response (short, body, headers, response, exchange, none)',
      'exchange'
    )
    .option('-s, --silent', 'log only request')
    .option('--prune-refs', 'only execute leaf requests (prune referenced dependencies)')
    .option('--no-cache', 'skip cache, always rebuild dependency model')
    .option('--show-plan', 'print execution plan without running')
    .option('-r, --resume', 'resume from last failed request')
    .option('--state-file <path>', 'path to state file for resume (default: .uctest-state)')
    .option('--timeout <timeout>', 'maximum time allowed for connections', utils.toNumber)
    .option('--var  <variables...>', 'list of variables (e.g foo="bar")')
    .option('-v, --verbose', 'make the operation more talkative')
    .action(execute);
  return program;
}

/**
 * Parse positional arguments into tags (@prefix), names (:prefix), and paths.
 * Supports uctest-style syntax: uctest @v301 @ci :checkout path/to/spec
 *
 * Tags use AND logic: @foo @bar means "tests with BOTH foo AND bar tags"
 */
function parsePositionalArgs(args: Array<string>): { tags: Array<string>; names: Array<string>; paths: Array<string> } {
  const tags: Array<string> = [];
  const names: Array<string> = [];
  const paths: Array<string> = [];

  for (const arg of args) {
    if (arg.startsWith('@')) {
      const tagValue = arg.slice(1);
      if (tagValue) {
        // Reject commas - use separate @tag arguments instead
        if (tagValue.includes(',')) {
          console.error(`Error: Commas not supported in tags. Use separate arguments: @${tagValue.split(',').join(' @')}`);
          process.exit(1);
        }
        tags.push(tagValue);
      }
    } else if (arg.startsWith(':')) {
      // Name: :name (multiple names use OR logic)
      const nameValue = arg.slice(1);
      if (nameValue) {
        names.push(nameValue);
      }
    } else {
      // Path
      paths.push(arg);
    }
  }

  return { tags, names, paths };
}

async function execute(args: Array<string>, options: SendOptions): Promise<void> {
  // Parse positional args into tags, names, and paths
  const parsed = parsePositionalArgs(args);

  // Apply parsed values to options
  if (parsed.tags.length > 0) {
    options.tag = parsed.tags;
  }
  if (parsed.names.length > 0) {
    options.name = parsed.names;
  }

  // Default paths to current directory if none specified
  const fileNames = parsed.paths.length > 0 ? parsed.paths : ['./**/*.http'];

  // bail (stop on first failure) is ON by default
  // When keepGoing is true, bail is disabled
  const bailEnabled = !options.keepGoing;

  const context = convertCliOptionsToContext(options);
  const { httpFiles, config, httpFileStore } = await getHttpFiles(fileNames, bailEnabled, context.config || {});
  context.config = config;
  initRequestLogger(options, context);

  // State file for resume functionality
  const defaultStateFile = join(process.cwd(), '.uctest-state');
  const resumeStateFile = options.resume ? (options.stateFile || defaultStateFile) : undefined;
  let resumeState = resumeStateFile ? await loadResumeState(resumeStateFile) : undefined;
  try {
    if (httpFiles.length > 0) {
      let selection = await selectHttpFiles(httpFiles, options);
      if (selection.length === 0) {
        console.error('No tests match the specified filters');
        process.exit(1);
      }
      if (options.pruneRefs) {
        await executeWithOptimizer(
          httpFiles,
          httpFileStore,
          selection,
          context,
          options,
          resumeState,
          resumeStateFile,
          bailEnabled
        );
        return;
      }
      if (resumeState) {
        selection = applyResumeState(selection, resumeState);
        resumeState = undefined;
      }
      const totals = countSelectedRequests(selection, httpFiles);
      const totalRequests = totals.totalRequests;
      const totalFiles = totals.totalFiles;

      let emittedRequests = 0;
      const emitJsonLine = options.jsonl ? createJsonlEmitter() : undefined;

      if (options.jsonl) {
        emitJsonLine?.({
          type: 'start',
          totalRequests,
          totalFiles,
        });
        context.processedHttpRegionListener = processedHttpRegion => {
          emittedRequests += 1;
          emitJsonLine?.({
            type: 'request',
            index: emittedRequests,
            totalRequests,
            request: toSendOutputRequest(processedHttpRegion, options),
          });
        };
      } else {
        context.processedHttpRegionListener = undefined;
      }
      context.processedHttpRegions = [];

      const sendFuncs = selection.map(
        ({ httpFile, httpRegions }) =>
          async function sendHttpFile() {
            if (!options.json && context.scriptConsole) {
              context.scriptConsole.info(`--------------------- ${httpFile.fileName}  --`);
            }
            await send(Object.assign({}, context, { httpFile, httpRegions }));
          }
      );
      await utils.promiseQueue(1, ...sendFuncs);

      const processedHttpRegions = context.processedHttpRegions || [];
      const firstFailed =
        options.resume && bailEnabled ? findFirstFailedRegion(processedHttpRegions) : undefined;

      if (options.jsonl) {
        emittedRequests = emitRemainingJsonLines(
          processedHttpRegions,
          options,
          emitJsonLine,
          emittedRequests,
          totalRequests
        );
        const cliJsonOutput = toSendJsonOutput(processedHttpRegions, options);
        emitJsonLine?.({
          type: 'summary',
          totalRequests,
          totalFiles,
          summary: cliJsonOutput.summary,
        });
      } else {
        reportOutput(context, options);
      }

      if (resumeStateFile && options.resume && bailEnabled) {
        if (firstFailed) {
          await saveResumeState(resumeStateFile, firstFailed);
        } else {
          await clearResumeState(resumeStateFile);
        }
      }
    } else {
      console.error(`uctest cannot find any .http files matching: ${fileNames.join(', ')}`);
    }
  } finally {
    context.scriptConsole?.flush?.();
  }
}

function reportOutput(context: Omit<models.HttpFileSendContext, 'httpFile'>, options: SendOptions) {
  const processedHttpRegions = context.processedHttpRegions || [];

  const cliJsonOutput = toSendJsonOutput(processedHttpRegions, options);
  if (options.json) {
    console.info(utils.stringifySafe(cliJsonOutput, 2));
  } else if (context.scriptConsole) {
    context.scriptConsole.info('');

    const requestCounts: Array<string> = [];
    if (cliJsonOutput.summary.successRequests > 0) {
      requestCounts.push(chalk`{green ${cliJsonOutput.summary.successRequests} succeeded}`);
    }
    if (cliJsonOutput.summary.failedRequests > 0) {
      requestCounts.push(chalk`{red ${cliJsonOutput.summary.failedRequests} failed}`);
    }
    if (cliJsonOutput.summary.erroredRequests > 0) {
      requestCounts.push(chalk`{red ${cliJsonOutput.summary.erroredRequests} errored}`);
    }
    if (cliJsonOutput.summary.skippedRequests > 0) {
      requestCounts.push(chalk`{yellow ${cliJsonOutput.summary.skippedRequests} skipped}`);
    }
    context.scriptConsole.info(
      chalk`{bold ${cliJsonOutput.summary.totalRequests}} requests processed (${requestCounts.join(', ')})`
    );
  }
}

function emitRemainingJsonLines(
  processedHttpRegions: Array<models.ProcessedHttpRegion>,
  options: SendOptions,
  emitJsonLine: ((line: unknown) => void) | undefined,
  emittedRequests: number,
  totalRequests: number
) {
  if (!emitJsonLine) {
    return emittedRequests;
  }
  for (let i = emittedRequests; i < processedHttpRegions.length; i += 1) {
    emitJsonLine({
      type: 'request',
      index: i + 1,
      totalRequests,
      request: toSendOutputRequest(processedHttpRegions[i], options),
    });
  }
  return Math.max(emittedRequests, processedHttpRegions.length);
}

function createJsonlEmitter() {
  return (line: unknown) => {
    process.stdout.write(`${utils.stringifySafe(line)}\n`);
  };
}

function countSelectedRequests(selection: SelectActionResult, allHttpFiles: Array<models.HttpFile>): {
  totalRequests: number;
  totalFiles: number;
} {
  // Map all regions by name across loaded files so dependency resolution can include fixtures without tags.
  const regionsByName = new Map<string, Array<models.HttpRegion>>();
  const regionFiles = new Map<models.HttpRegion, models.HttpFile>();

  for (const httpFile of allHttpFiles) {
    for (const region of httpFile.httpRegions) {
      regionFiles.set(region, httpFile);
      const name = utils.toString(region.metaData?.name);
      if (!name) {
        continue;
      }
      const list = regionsByName.get(name) || [];
      list.push(region);
      regionsByName.set(name, list);
    }
  }

  const visitedRegions = new Set<models.HttpRegion>();
  const visitedFiles = new Set<models.HttpFile>();
  const queue: Array<models.HttpRegion> = [];

  for (const { httpFile, httpRegions } of selection) {
    const regions = httpRegions ?? httpFile.httpRegions;
    for (const region of regions) {
      if (region.metaData?.disabled === true || region.metaData?.skip) {
        continue;
      }
      queue.push(region);
    }
  }

  while (queue.length > 0) {
    const region = queue.pop();
    if (!region || visitedRegions.has(region)) {
      continue;
    }
    visitedRegions.add(region);
    const file = regionFiles.get(region);
    if (file) {
      visitedFiles.add(file);
    }
    for (const refName of getRefNames(region)) {
      const targets = regionsByName.get(refName);
      if (!targets) {
        continue;
      }
      for (const target of targets) {
        if (target.metaData?.disabled === true || target.metaData?.skip) {
          continue;
        }
        queue.push(target);
      }
    }
  }

  return {
    totalRequests: visitedRegions.size,
    totalFiles: visitedFiles.size,
  };
}

function selectionToRegionIds(selection: SelectActionResult): Array<string> {
  const ids: Array<string> = [];
  for (const { httpFile, httpRegions } of selection) {
    const regions = httpRegions ?? httpFile.httpRegions;
    for (const region of regions) {
      if (region.metaData?.disabled === true || region.metaData?.skip || region.isGlobal()) {
        continue;
      }
      ids.push(region.id);
    }
  }
  return ids;
}

async function ensureHttpFilesForPlan(
  plan: ExecutionPlan,
  model: DependencyModel,
  httpFiles: Array<models.HttpFile>,
  httpFileStore: HttpFileStore,
  config: models.EnvironmentConfig | undefined
): Promise<models.EnvironmentConfig | undefined> {
  const httpFilesByPath = new Map<string, models.HttpFile>();
  for (const file of httpFiles) {
    const normalized = normalizeRelativePath(file.fileName, model.rootDir);
    if (normalized) {
      httpFilesByPath.set(normalized, file);
    }
  }

  const requiredFiles = new Set<string>();
  for (const stage of plan.stages) {
    for (const unit of stage.units) {
      for (const regionId of unit.regionIds) {
        const region = model.regions[regionId];
        if (region) {
          requiredFiles.add(region.file);
        }
      }
    }
  }

  const queue = Array.from(requiredFiles);
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const imports = model.importGraph[current] || [];
    for (const imp of imports) {
      if (!requiredFiles.has(imp)) {
        requiredFiles.add(imp);
        queue.push(imp);
      }
    }
  }

  const parseOptions: models.HttpFileStoreOptions = {
    workingDir: process.cwd(),
    config,
  };

  for (const file of Array.from(requiredFiles)) {
    if (httpFilesByPath.has(file)) {
      continue;
    }
    const absolute = join(model.rootDir, file);
    const httpFile = await httpFileStore.getOrCreate(
      absolute,
      async () => await fs.readFile(absolute, 'utf8'),
      0,
      parseOptions
    );
    httpFilesByPath.set(file, httpFile);
    httpFiles.push(httpFile);
  }

  return parseOptions.config;
}

async function executeWithOptimizer(
  httpFiles: Array<models.HttpFile>,
  httpFileStore: HttpFileStore,
  selection: SelectActionResult,
  context: Omit<models.HttpFileSendContext, 'httpFile'> & { options?: Record<string, unknown> },
  options: SendOptions,
  resumeState: ResumeState | undefined,
  resumeStateFile: string | undefined,
  bailEnabled: boolean
): Promise<void> {
  const selectionIds = selectionToRegionIds(selection);
  const rootDir = getModelRootDir(httpFiles);
  const model = await loadOrBuildModel(rootDir, {
    noCache: options.noCache,
  });

  const graph = buildDependencyGraph(model);
  const chains = detectForceRefChains(graph);
  const plan = computeExecutionPlan(model, graph, chains, {
    selection: selectionIds,
    filters: {
      tags: options.tag,
      names: options.name,
      line: options.line,
    },
  });

  if (options.showPlan) {
    await executeOptimizedPlan(plan, model, httpFiles, context, { showPlan: true });
    return;
  }

  context.options = { ...(context.options || {}), skipRefResolution: true };
  context.processedHttpRegions = [];
  // Preload environment variables once to ensure globals have access before execution
  if (httpFiles.length > 0) {
    const preload = await createEmptyProcessorContext({
      ...(context as models.HttpFileSendContext),
      httpFile: httpFiles[0],
    });
    if (preload.variables) {
      context.variables = { ...(context.variables || {}), ...preload.variables };
    }
  }

  const updatedConfig = await ensureHttpFilesForPlan(plan, model, httpFiles, httpFileStore, context.config);
  context.config = updatedConfig || context.config;

  const totalRequests = plan.stats.totalRegions;
  const totalFiles = countFilesInPlan(plan, model);

  let emittedRequests = 0;
  const emitJsonLine = options.jsonl ? createJsonlEmitter() : undefined;

  if (options.jsonl) {
    emitJsonLine?.({
      type: 'start',
      totalRequests,
      totalFiles,
    });
    context.processedHttpRegionListener = processedHttpRegion => {
      emittedRequests += 1;
      emitJsonLine?.({
        type: 'request',
        index: emittedRequests,
        totalRequests,
        request: toSendOutputRequest(processedHttpRegion, options),
      });
    };
  } else {
    context.processedHttpRegionListener = undefined;
  }

  await executeOptimizedPlan(plan, model, httpFiles, context, { resumeState });

  const processedHttpRegions = context.processedHttpRegions || [];
  const firstFailed = options.resume && bailEnabled ? findFirstFailedRegion(processedHttpRegions) : undefined;

  if (options.jsonl) {
    emittedRequests = emitRemainingJsonLines(
      processedHttpRegions,
      options,
      emitJsonLine,
      emittedRequests,
      totalRequests
    );
    const cliJsonOutput = toSendJsonOutput(processedHttpRegions, options);
    emitJsonLine?.({
      type: 'summary',
      totalRequests,
      totalFiles,
      summary: cliJsonOutput.summary,
    });
  } else {
    reportOutput(context, options);
  }

  if (resumeStateFile && options.resume && bailEnabled) {
    if (firstFailed) {
      await saveResumeState(resumeStateFile, firstFailed);
    } else {
      await clearResumeState(resumeStateFile);
    }
  }
}

function normalizeRelativePath(fileName: models.PathLike | undefined, rootDir: string): string | undefined {
  if (!fileName) {
    return undefined;
  }
  const fsPath = fileProvider.fsPath(fileName) || fileProvider.toString(fileName);
  if (!fsPath) {
    return undefined;
  }
  const relPath = isAbsolute(fsPath) ? relative(rootDir, fsPath) : fsPath;
  return relPath.split(sep).join('/');
}

function findFirstFailedRegion(processed: Array<models.ProcessedHttpRegion>) {
  return processed.find(region =>
    region.testResults?.some(
      testResult =>
        testResult.status === models.TestResultStatus.ERROR || testResult.status === models.TestResultStatus.FAILED
    )
  );
}

function getModelRootDir(httpFiles: Array<models.HttpFile>): string {
  const filePaths = httpFiles
    .map(file => fileProvider.fsPath(file.fileName) || fileProvider.toString(file.fileName))
    .filter((value): value is string => !!value)
    .map(value => (isAbsolute(value) ? value : resolve(process.cwd(), value)));

  if (filePaths.length === 0) {
    return process.cwd();
  }

  const root = parse(filePaths[0]).root || process.cwd();
  const segments = filePaths.map(filePath => {
    const dir = parse(filePath).dir;
    const rel = relative(root, dir);
    return rel ? rel.split(sep).filter(Boolean) : [];
  });
  const minLength = Math.min(...segments.map(parts => parts.length));
  const commonParts: string[] = [];

  for (let index = 0; index < minLength; index += 1) {
    const part = segments[0][index];
    if (segments.every(parts => parts[index] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return join(root, ...commonParts);
}

export function applyPruneRefs(selection: SelectActionResult): SelectActionResult {
  const selectionWithRegions = selection.map(entry => ({
    httpFile: entry.httpFile,
    regions: entry.httpRegions ?? entry.httpFile.httpRegions,
  }));

  const allRegions: Array<models.HttpRegion> = [];
  for (const { regions } of selectionWithRegions) {
    for (const region of regions) {
      if (region.metaData?.disabled === true || region.metaData?.skip) {
        continue;
      }
      allRegions.push(region);
    }
  }

  const regionsByName = new Map<string, Array<models.HttpRegion>>();
  for (const region of allRegions) {
    const name = utils.toString(region.metaData?.name);
    if (name) {
      const regionsWithName = regionsByName.get(name) || [];
      regionsWithName.push(region);
      regionsByName.set(name, regionsWithName);
    }
  }

  const referencedRegions = new Set<models.HttpRegion>();
  for (const region of allRegions) {
    for (const refName of getRefNames(region)) {
      const targets = regionsByName.get(refName);
      targets?.forEach(target => referencedRegions.add(target));
    }
  }

  const leafRegions = new Set(allRegions.filter(region => !referencedRegions.has(region)));

  const prunedSelection: SelectActionResult = [];
  for (const { httpFile, regions } of selectionWithRegions) {
    const filtered = regions.filter(region => leafRegions.has(region));
    if (filtered.length === 0) {
      continue;
    }
    const useFullFile = regions === httpFile.httpRegions && filtered.length === regions.length;
    prunedSelection.push({
      httpFile,
      httpRegions: useFullFile ? undefined : filtered,
    });
  }

  return prunedSelection;
}

function getRefNames(region: models.HttpRegion): Array<string> {
  const result: Array<string> = [];
  const refValues = [region.metaData?.ref, region.metaData?.forceRef];
  for (const value of refValues) {
    if (!value || value === true) {
      continue;
    }
    const asString = utils.toString(value);
    if (!asString) {
      continue;
    }
    const refs = asString
      .split(/[,\s]+/u)
      .map(ref => ref.trim())
      .filter(Boolean);
    result.push(...refs);
  }
  return result;
}

interface ResumeState {
  fileName: string;
  line: number;
  name?: string;
}

export function applyResumeState(selection: SelectActionResult, state: ResumeState): SelectActionResult {
  const resumedSelection: SelectActionResult = [];
  let skipping = true;

  for (const entry of selection) {
    const regions = entry.httpRegions ?? entry.httpFile.httpRegions;
    const normalizedFile = normalizeFileName(entry.httpFile.fileName);
    const filtered: Array<models.HttpRegion> = [];

    for (const region of regions) {
      if (region.metaData?.disabled === true || region.metaData?.skip) {
        continue;
      }
      if (skipping) {
        if (matchesResumeTarget(normalizedFile, region, state)) {
          skipping = false;
          filtered.push(region);
        }
      } else {
        filtered.push(region);
      }
    }

    if (filtered.length > 0) {
      const useFullFile = regions === entry.httpFile.httpRegions && filtered.length === regions.length;
      resumedSelection.push({
        httpFile: entry.httpFile,
        httpRegions: useFullFile ? undefined : filtered,
      });
    }
  }

  return skipping ? selection : resumedSelection;
}

function matchesResumeTarget(
  normalizedFile: string | undefined,
  region: models.HttpRegion,
  state: ResumeState
): boolean {
  if (!normalizedFile || normalizedFile !== state.fileName) {
    return false;
  }
  return region.symbol.startLine === state.line;
}

function normalizeFileName(fileName: models.PathLike | undefined) {
  if (!fileName) {
    return undefined;
  }
  const fsPath = fileProvider.fsPath(fileName) || fileProvider.toString(fileName);
  if (!fsPath) {
    return undefined;
  }
  return isAbsolute(fsPath) ? relative(process.cwd(), fsPath) : fsPath;
}

async function loadResumeState(stateFile: string): Promise<ResumeState | undefined> {
  try {
    const content = await fs.readFile(stateFile, 'utf-8');
    return JSON.parse(content) as ResumeState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Failed to read resume state from ${stateFile}:`, err);
    }
    return undefined;
  }
}

async function saveResumeState(stateFile: string, failedRegion: models.ProcessedHttpRegion): Promise<void> {
  const fileName = normalizeFileName(failedRegion.filename);
  if (!fileName) {
    return;
  }
  const state: ResumeState = {
    fileName,
    line: failedRegion.symbol.startLine,
    name: utils.toString(failedRegion.metaData?.name),
  };
  await fs.writeFile(stateFile, utils.stringifySafe(state, 2));
}

async function clearResumeState(stateFile: string): Promise<void> {
  try {
    await fs.unlink(stateFile);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Failed to clear resume state at ${stateFile}:`, err);
    }
  }
}

export function convertCliOptionsToContext(cliOptions: SendOptions) {
  const context: Omit<models.HttpFileSendContext, 'httpFile'> & { options: Record<string, unknown> } = {
    config: {
      log: {
        level: getLogLevel(cliOptions),
      },
      request: {
        timeout: cliOptions.timeout,
      },
    },
    variables: cliOptions.var
      ? Object.fromEntries(
          cliOptions.var.map(obj => {
            const split = obj.split('=');
            return [split[0], split.slice(1).join('=')];
          })
        )
      : undefined,
    options: {},
  };
  return context;
}

export function initRequestLogger(cliOptions: SendOptions, context: Omit<models.HttpFileSendContext, 'httpFile'>) {
  if (cliOptions.jsonl) {
    return;
  }
  const scriptConsole = new Logger({
    level: getLogLevel(cliOptions),
  });
  scriptConsole.collectMessages();
  context.scriptConsole = scriptConsole;
  if (!cliOptions.json) {
    context.logStream = getStreamLogger(cliOptions);
    const logger = getRequestLogger(cliOptions, context.config, scriptConsole);
    context.logResponse = async (response, httpRegion) => {
      if (logger) {
        await logger(response, httpRegion);
      }
      scriptConsole.flush();
    };
  }
}

async function getHttpFiles(
  fileNames: Array<string>,
  bailEnabled: boolean,
  config: models.EnvironmentConfig
): Promise<{ httpFiles: models.HttpFile[]; config: models.EnvironmentConfig | undefined; httpFileStore: HttpFileStore }> {
  const httpFiles: models.HttpFile[] = [];
  const httpFileStore = new HttpFileStore({
    cli: createCliPluginRegister(bailEnabled),
  });

  const parseOptions: models.HttpFileStoreOptions = {
    workingDir: process.cwd(),
    config,
  };
  const paths: Array<string> = [];

  for (const fileName of fileNames) {
    paths.push(...(await queryGlobbyPattern(fileName)));
  }
  for (const path of paths) {
    const httpFile = await httpFileStore.getOrCreate(
      path,
      async () => await fs.readFile(path, 'utf8'),
      0,
      parseOptions
    );
    httpFiles.push(httpFile);
  }

  return {
    httpFiles,
    config: parseOptions.config,
    httpFileStore,
  };
}

async function queryGlobbyPattern(fileName: string) {
  const globOptions: Options = {
    gitignore: true,
  };
  const { globby } = await import('globby');
  const paths = await globby(fileName, globOptions);
  if ((paths && paths.length > 0) || sep === '/') {
    return paths;
  }
  return await globby(fileName.replace(/\\/gu, '/'), globOptions);
}

function getStreamLogger(options: SendOptions): models.StreamLogger | undefined {
  if (options.output !== 'none') {
    return async function logStream(type, response) {
      const data = Buffer.isBuffer(response.body) ? response.body.toString('utf-8') : response.body;
      console.info(`${new Date().toLocaleTimeString()} - ${type}: `, data);
    };
  }
  return undefined;
}

function getRequestLogger(
  options: SendOptions,
  config: models.EnvironmentConfig | undefined,
  logger: models.ConsoleLogHandler
): models.RequestLogger | undefined {
  const cliLoggerOptions = {
    responseBodyPrettyPrint: true,
  };
  const requestLoggerOptions = getRequestLoggerOptions(options.output, cliLoggerOptions, config?.log?.options);

  const requestFailedLoggerOptions = getRequestLoggerOptions(
    options.outputFailed,
    cliLoggerOptions,
    config?.log?.options
  );

  if (requestLoggerOptions || requestFailedLoggerOptions) {
    return utils.requestLoggerFactory(
      args => logger.logPriority(args),
      requestLoggerOptions,
      requestFailedLoggerOptions
    );
  }
  return undefined;
}
function getRequestLoggerOptions(
  output: OutputType | undefined,
  ...options: Array<models.RequestLoggerFactoryOptions | undefined>
): models.RequestLoggerFactoryOptions | undefined {
  let result: models.RequestLoggerFactoryOptions | undefined;
  switch (output) {
    case 'body':
      result = {
        responseBodyLength: 0,
      };
      break;
    case 'headers':
      result = {
        requestOutput: true,
        requestHeaders: true,
        responseHeaders: true,
      };
      break;
    case 'response':
      result = {
        responseHeaders: true,
        responseBodyLength: 0,
      };
      break;
    case 'none':
      return undefined;
    case 'short':
      result = { useShort: true };
      break;
    case 'timings':
      result = {
        timings: true,
      };
      break;
    case 'exchange':
      result = {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
        timings: true,
      };
      break;
    default:
      result = {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
      };
      break;
  }

  return Object.assign({}, ...options, result);
}
