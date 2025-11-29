import { getHttpLineGenerator, HttpRegionParserResult, ParserContext } from '../../../models';
export declare function parseComment(getLineReader: getHttpLineGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult>;
export interface CommentParserResult {
    startLine: number;
    endLine: number;
    endOffset: number;
    comment: string;
}
