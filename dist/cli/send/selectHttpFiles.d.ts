import * as models from '../../models';
import { SendOptions } from './options';
export type SelectActionResult = Array<{
    httpRegions?: Array<models.HttpRegion>;
    httpFile: models.HttpFile;
}>;
/**
 * Select HTTP files and regions based on CLI filter options.
 *
 * Filter logic:
 * - Tags: AND logic (all specified tags must be present)
 * - Names: OR logic (any specified name matches)
 * - Between filter types: AND logic (must pass all specified filters)
 * - No filters: return all files with all regions
 */
export declare function selectHttpFiles(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions): Promise<SelectActionResult>;
