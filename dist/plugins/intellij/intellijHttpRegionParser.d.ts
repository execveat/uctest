import * as models from '../../models';
import { IntellijScriptData } from './intellijAction';
export interface IntelliJParserResult {
    startLine: number;
    endLine: number;
    endOffset: number;
    data: models.ScriptData | IntellijScriptData;
    isBeforeRequest: boolean;
    symbols?: Array<models.HttpSymbol>;
}
export declare function parseIntellijScript(getLineReader: models.getHttpLineGenerator, { httpRegion }: models.ParserContext): Promise<models.HttpRegionParserResult>;
