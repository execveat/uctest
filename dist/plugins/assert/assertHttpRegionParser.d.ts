import * as models from '../../models';
import * as p from './predicates';
export declare const predicates: Array<p.TestPredicate>;
export declare function parseAssertLine(getLineReader: models.getHttpLineGenerator, { httpRegion }: models.ParserContext): Promise<models.HttpRegionParserResult>;
