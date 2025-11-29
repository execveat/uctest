import { default as chalk } from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import type { Options } from 'globby';
import { isAbsolute, join, relative, sep } from 'path';

import { send } from '../../httpYacApi';
import { Logger, fileProvider } from '../../io';
import * as models from '../../models';
import { HttpFileStore } from '../../store';
import * as utils from '../../utils';
import { toSendJsonOutput, toSendOutputRequest } from './jsonOutput';
import { getLogLevel, OutputType, SendFilterOptions, SendOptions } from './options';
import { createCliPluginRegister } from './plugin';
import { transformToJunit } from './junitUtils';
import { SelectActionResult, selectHttpFiles } from './selectHttpFiles';

export function sendCommand() {
  const program = new Command('send')
    .description('send/ execute http files')
    .usage('<fileName...> [options]')
    .argument('<fileName...>', 'path to file or glob pattern')
    .option('-a, --all', 'execute all http requests in a http file')
    .option('--bail', 'stops when a test case fails')
    .option('-e, --env  <env...>', 'list of environments')
    .option('--filter <filter>', ' filter requests output (only-failed)')
    .option('--insecure', 'allow insecure server connections when using ssl')
    .option('-i --interactive', 'do not exit the program after request, go back to selection')
    .option('--json', 'use json output')
    .option('--jsonl', 'stream json lines output')
    .option('--junit', 'use junit xml output')
    .option('-l, --line <line>', 'line of the http requests')
    .option(
      '-n, --name <name>',
      'name of the http requests',
      (value, previous: Array<string> | undefined) => (previous ? [...previous, value] : [value])
    )
    .option('--no-color', 'disable color support')
    .option('-o, --output <output>', 'output format of response (short, body, headers, response, exchange, none)')
    .option(
      '--output-failed <output>',
      'output format of failed response (short, body, headers, response, exchange, none)'
    )
    .option('--raw', 'prevent formatting of response body')
    .option('--quiet', '')
    .option('--repeat <count>', 'repeat count for requests', utils.toNumber)
    .option('--repeat-mode <mode>', 'repeat mode: sequential, parallel (default)')
    .option('--parallel <count>', 'send parallel requests', utils.toNumber)
    .option('-s, --silent', 'log only request')
    .option('-t, --tag  <tag...>', 'list of tags to execute')
    .option('--prune-refs', 'only execute leaf requests (prune referenced dependencies)')
    .option('--resume', 'resume from last failed request (requires --bail)')
    .option('--timeout <timeout>', 'maximum time allowed for connections', utils.toNumber)
    .option('--var  <variables...>', 'list of variables (e.g foo="bar")')
    .option('-v, --verbose', 'make the operation more talkative')
    .action(execute);
  return program;
}

async function execute(fileNames: Array<string>, options: SendOptions): Promise<void> {
  const context = convertCliOptionsToContext(options);
  const { httpFiles, config } = await getHttpFiles(fileNames, options, context.config || {});
  context.config = config;
  initRequestLogger(options, context);
  const resumeStateFile = options.resume ? join(process.cwd(), '.httpyac-state') : undefined;
  let resumeState = resumeStateFile ? await loadResumeState(resumeStateFile) : undefined;
  try {
    if (httpFiles.length > 0) {
      let isFirstRequest = true;
      while (options.interactive || isFirstRequest) {
        isFirstRequest = false;
        let selection = await selectHttpFiles(httpFiles, options);
        if (options.pruneRefs) {
          selection = applyPruneRefs(selection);
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
              if (!options.junit && !options.json && context.scriptConsole && selection.length > 1) {
                context.scriptConsole.info(`--------------------- ${httpFile.fileName}  --`);
              }
              await send(Object.assign({}, context, { httpFile, httpRegions }));
            }
        );
        await utils.promiseQueue(options.parallel || 1, ...sendFuncs);

        const processedHttpRegions = context.processedHttpRegions || [];
        const firstFailed =
          options.resume && options.bail ? findFirstFailedRegion(processedHttpRegions) : undefined;

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

        if (resumeStateFile && options.resume && options.bail) {
          if (firstFailed) {
            await saveResumeState(resumeStateFile, firstFailed);
          } else {
            await clearResumeState(resumeStateFile);
          }
        }
      }
    } else {
      console.error(`httpYac cannot find the specified file ${fileNames.join(', ')}.`);
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
  } else if (options.junit) {
    console.info(transformToJunit(cliJsonOutput));
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

function findFirstFailedRegion(processed: Array<models.ProcessedHttpRegion>) {
  return processed.find(region =>
    region.testResults?.some(
      testResult =>
        testResult.status === models.TestResultStatus.ERROR || testResult.status === models.TestResultStatus.FAILED
    )
  );
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
  const context: Omit<models.HttpFileSendContext, 'httpFile'> = {
    activeEnvironment: cliOptions.env,
    repeat: cliOptions.repeat
      ? {
          count: cliOptions.repeat,
          type: cliOptions.repeatMode === 'sequential' ? models.RepeatOrder.sequential : models.RepeatOrder.parallel,
        }
      : undefined,
    config: {
      log: {
        level: getLogLevel(cliOptions),
      },
      request: {
        timeout: cliOptions.timeout,
        https: cliOptions.insecure ? { rejectUnauthorized: false } : undefined,
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
  };
  return context;
}

export function initRequestLogger(cliOptions: SendOptions, context: Omit<models.HttpFileSendContext, 'httpFile'>) {
  if (cliOptions.jsonl) {
    return;
  }
  const scriptConsole = new Logger({
    level: getLogLevel(cliOptions),
    onlyFailedTests: cliOptions.filter === SendFilterOptions.onlyFailed,
  });
  scriptConsole.collectMessages();
  context.scriptConsole = scriptConsole;
  if (!cliOptions.json && !cliOptions.junit) {
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

async function getHttpFiles(fileNames: Array<string>, options: SendOptions, config: models.EnvironmentConfig) {
  const httpFiles: models.HttpFile[] = [];
  const httpFileStore = new HttpFileStore({
    cli: createCliPluginRegister(!!options.bail),
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
    onlyFailed: options.filter === SendFilterOptions.onlyFailed,
    responseBodyPrettyPrint: !options.raw,
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
