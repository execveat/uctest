import { VariableProviderContext, Variables } from '../../models';
export declare function provideIntellijEnvironments(context: VariableProviderContext): Promise<string[]>;
export declare function provideIntellijVariables(envs: string[] | undefined, context: VariableProviderContext): Promise<Variables>;
