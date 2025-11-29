import { ProcessorContext, VariableType } from '../../../models';
export declare function hostVariableReplacer(text: unknown, type: VariableType | string, { variables, request }: ProcessorContext): Promise<unknown>;
