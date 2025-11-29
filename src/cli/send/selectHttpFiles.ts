import * as models from '../../models';
import * as utils from '../../utils';
import { SendOptions } from './options';

export type SelectActionResult = Array<{ httpRegions?: Array<models.HttpRegion>; httpFile: models.HttpFile }>;

/**
 * Select HTTP files and regions based on CLI filter options.
 *
 * Filter logic:
 * - Tags: AND logic (all specified tags must be present)
 * - Names: OR logic (any specified name matches)
 * - Between filter types: AND logic (must pass all specified filters)
 * - No filters: return all files with all regions
 */
export async function selectHttpFiles(
  httpFiles: Array<models.HttpFile>,
  cliOptions: SendOptions
): Promise<SelectActionResult> {
  const hasFilters = hasAnyFilter(cliOptions);

  if (!hasFilters) {
    // No filters = return all files with all regions
    return httpFiles.map(httpFile => ({ httpFile }));
  }

  return selectHttpFilesWithArgs(httpFiles, cliOptions);
}

function hasAnyFilter(opts: SendOptions): boolean {
  return !!(
    (opts.tag && opts.tag.length > 0) ||
    (opts.name && opts.name.length > 0) ||
    opts.line !== undefined
  );
}

function selectHttpFilesWithArgs(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions) {
  const result: SelectActionResult = [];
  const requiredTags = cliOptions.tag || [];
  const requiredNames = cliOptions.name || [];
  const line = cliOptions.line;

  for (const httpFile of httpFiles) {
    const httpRegions = httpFile.httpRegions.filter(h => {
      // AND between filter types: must pass ALL specified filters

      // Tags: all must match (AND logic)
      if (requiredTags.length > 0 && !hasAllTags(h, requiredTags)) {
        return false;
      }

      // Names: any must match (OR logic within names)
      if (requiredNames.length > 0 && !hasAnyName(h, requiredNames)) {
        return false;
      }

      // Line: must be in range
      if (line !== undefined && !isLine(h, line)) {
        return false;
      }

      return true;
    });

    if (httpRegions.length > 0) {
      result.push({ httpFile, httpRegions });
    }
  }

  return result;
}

/**
 * Check if region has ALL required tags (AND logic).
 */
function hasAllTags(httpRegion: models.HttpRegion, requiredTags: Array<string>): boolean {
  if (!utils.isString(httpRegion.metaData?.tag)) {
    return false;
  }

  const regionTags = httpRegion.metaData.tag
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  if (regionTags.length === 0) {
    return false;
  }

  // All required tags must be present in region's tags
  return requiredTags.every(tag => regionTags.includes(tag));
}

/**
 * Check if region has ANY of the specified names (OR logic).
 */
function hasAnyName(httpRegion: models.HttpRegion, names: Array<string>): boolean {
  if (!utils.isString(httpRegion.metaData?.name)) {
    return false;
  }
  return names.includes(httpRegion.metaData.name);
}

/**
 * Check if region contains the specified line.
 */
function isLine(httpRegion: models.HttpRegion, line: number): boolean {
  return httpRegion.symbol.startLine <= line && httpRegion.symbol.endLine >= line;
}
