import { getHttpLineGenerator, HttpRegionParserResult, ParserContext } from '../../../models';
export declare function parseResponseRef(getLineReader: getHttpLineGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult>;
