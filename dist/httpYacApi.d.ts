import './registerPlugins';
import * as models from './models';
/**
 * process one httpRegion of HttpFile
 * @param httpFile httpFile
 */
export declare function send(context: models.SendContext): Promise<boolean>;
export declare function createEmptyProcessorContext<T extends models.VariableProviderContext>(context: T): Promise<T & {
    variables: models.Variables;
    options: Record<string, unknown>;
}>;
export declare function getVariables(context: models.VariableProviderContext): Promise<Record<string, unknown>>;
export declare function getEnvironments(context: models.VariableProviderContext): Promise<Array<string>>;
