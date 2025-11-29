import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../models';
export declare abstract class CodeBlockInterceptor implements HookInterceptor<[models.getHttpLineGenerator, models.ParserContext], undefined> {
    private readonly extensions;
    private readonly beginCodeBlock;
    private readonly endCodeBlock;
    abstract get id(): string;
    constructor(extensions: Array<string>, beginCodeBlock: RegExp | Array<RegExp>, endCodeBlock: RegExp);
    beforeTrigger(hookContext: HookTriggerContext<[models.getHttpLineGenerator, models.ParserContext], undefined>): Promise<boolean | undefined>;
    private getHttpBlockLines;
}
