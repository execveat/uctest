import { VariableProviderContext, Variables } from '../../../models';
export declare function provideConfigEnvironments(context: VariableProviderContext): Promise<string[]>;
export declare function provideConfigVariables(envs: string[] | undefined, context: VariableProviderContext): Promise<Variables>;
