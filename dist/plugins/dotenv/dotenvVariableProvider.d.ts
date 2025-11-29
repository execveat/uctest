import { VariableProviderContext, Variables } from '../../models';
export declare function provideDotenvEnvironments(context: VariableProviderContext): Promise<string[]>;
export declare function provideDotenvVariables(env: string[] | undefined, context: VariableProviderContext): Promise<Variables>;
