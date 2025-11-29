import * as models from '../models';
export declare function isOpenIdInformation(userSession: models.UserSession | undefined): userSession is models.OpenIdInformation;
export declare function isProcessorContext(context: unknown): context is models.ProcessorContext;
