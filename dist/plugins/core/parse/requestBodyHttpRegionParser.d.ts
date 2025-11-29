import * as models from '../../../models';
export declare function parseRequestBody(getLineReader: models.getHttpLineGenerator, context: models.ParserContext): Promise<models.HttpRegionParserResult>;
export declare function getRequestBody(context: models.ParserContext): models.ParserRequestBody;
