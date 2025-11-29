import * as models from '../../models';
import { SendOptions } from './options';
export type SelectActionResult = Array<{
    httpRegions?: Array<models.HttpRegion>;
    httpFile: models.HttpFile;
}>;
export declare function selectHttpFiles(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions): Promise<SelectActionResult>;
