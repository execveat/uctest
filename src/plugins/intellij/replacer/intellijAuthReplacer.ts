import * as models from '../../../models';
import { parseHandlebarsString } from '../../../utils';
import { replaceIntellijVariableRandom } from './replaceIntellijVariableRandom';

export async function replaceDynamicIntellijVariables(
  text: unknown,
  _type: models.VariableType | string,
  _context: models.ProcessorContext
): Promise<unknown> {
  return parseHandlebarsString(text, async (variable: string) => {
    return replaceIntellijVariableRandom(variable);
  });
}
