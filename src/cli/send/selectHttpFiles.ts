import * as models from '../../models';
import * as utils from '../../utils';
import { SendOptions } from './options';

export type SelectActionResult = Array<{ httpRegions?: Array<models.HttpRegion>; httpFile: models.HttpFile }>;

export async function selectHttpFiles(
  httpFiles: Array<models.HttpFile>,
  cliOptions: SendOptions
): Promise<SelectActionResult> {
  if (cliOptions.all) {
    return httpFiles.map(httpFile => ({
      httpFile,
    }));
  }
  const resultWithArgs = selectHttpFilesWithArgs(httpFiles, cliOptions);
  if (resultWithArgs.length > 0) {
    return resultWithArgs;
  }
  return await selectManualHttpFiles(httpFiles);
}

function selectHttpFilesWithArgs(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions) {
  const result: SelectActionResult = [];
  const tagMatchers = normalizeTagMatchers(cliOptions.tag);

  for (const httpFile of httpFiles) {
    const httpRegions = httpFile.httpRegions.filter(h => {
      if (hasName(h, cliOptions.name)) {
        return true;
      }
      if (hasTag(h, tagMatchers)) {
        return true;
      }
      if (isLine(h, cliOptions.line)) {
        return true;
      }
      return false;
    });
    if (httpRegions.length > 0) {
      result.push({
        httpFile,
        httpRegions,
      });
    }
  }
  return result;
}

function hasName(httpRegion: models.HttpRegion, names: Array<string> | undefined) {
  if (!names || names.length === 0 || !utils.isString(httpRegion.metaData?.name)) {
    return false;
  }
  return names.includes(httpRegion.metaData.name);
}

function isLine(httpRegion: models.HttpRegion, line: number | undefined) {
  if (line !== undefined) {
    return line && httpRegion.symbol.startLine <= line && httpRegion.symbol.endLine >= line;
  }
  return false;
}

function normalizeTagMatchers(tags: Array<string> | undefined): Array<Array<string>> {
  const matchers: Array<Array<string>> = [];

  if (!tags || tags.length === 0) {
    return matchers;
  }

  for (const rawTag of tags) {
    if (!rawTag) {
      continue;
    }

    const sanitized = rawTag.replace(/\s+/gu, '');
    const segments = sanitized.split(',').filter(Boolean);

    for (const segment of segments) {
      const allTags = segment.split('+').filter(Boolean);
      if (allTags.length > 0) {
        matchers.push(allTags);
      }
    }
  }

  return matchers;
}

function hasTag(httpRegion: models.HttpRegion, matchers: Array<Array<string>>) {
  if (!matchers || matchers.length === 0 || !utils.isString(httpRegion.metaData?.tag)) {
    return false;
  }

  const metaDataTag = httpRegion.metaData.tag?.split(',').map(t => t.trim()).filter(Boolean);
  if (!metaDataTag || metaDataTag.length === 0) {
    return false;
  }

  return matchers.some(group => group.every(tag => metaDataTag.includes(tag)));
}

async function selectManualHttpFiles(httpFiles: Array<models.HttpFile>): Promise<SelectActionResult> {
  const httpRegionMap: Record<string, SelectActionResult> = {};
  const hasManyFiles = httpFiles.length > 1;
  const cwd = `${process.cwd()}`;
  for (const httpFile of httpFiles) {
    const fileName = utils.ensureString(httpFile.fileName)?.replace(cwd, '.');
    httpRegionMap[hasManyFiles ? `${fileName}: all` : 'all'] = [{ httpFile }];

    for (const httpRegion of httpFile.httpRegions) {
      if (!httpRegion.isGlobal()) {
        const name = httpRegion.symbol.name;
        httpRegionMap[hasManyFiles ? `${fileName}: ${name}` : name] = [
          {
            httpRegions: [httpRegion],
            httpFile,
          },
        ];
      }
    }
  }
  const inquirer = await import('inquirer');
  const answer = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'region',
      message: 'please choose which region to use',
      choices: Object.entries(httpRegionMap).map(([key]) => key),
    },
  ]);
  if (answer.region && httpRegionMap[answer.region]) {
    return httpRegionMap[answer.region];
  }
  return [];
}
