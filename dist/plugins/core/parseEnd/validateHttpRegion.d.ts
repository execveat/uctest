import * as models from '../../../models';
/**
 * Validates an HttpRegion for common authoring mistakes that could cause
 * runtime issues like infinite loops or confusing behavior.
 */
export declare function validateHttpRegion(context: models.ParserContext): Promise<void>;
