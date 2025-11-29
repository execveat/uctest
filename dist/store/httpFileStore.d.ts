import * as models from '../models';
export declare class HttpFileStore implements models.HttpFileStore {
    private readonly plugins;
    private readonly storeCache;
    constructor(plugins?: Record<string, models.ConfigureHooks>);
    private getFromStore;
    get(fileName: models.PathLike): models.HttpFile | undefined;
    getAll(): Array<models.HttpFile>;
    getOrCreate(fileName: models.PathLike, getText: () => Promise<string>, version: number, options: models.HttpFileStoreOptions): Promise<models.HttpFile>;
    parse(fileName: models.PathLike, text: string, options: models.HttpFileStoreOptions): Promise<models.HttpFile>;
    remove(fileName: models.PathLike): boolean;
    rename(oldFileName: models.PathLike, newFileName: models.PathLike): void;
    clear(): void;
    initHttpFile(fileName: models.PathLike, options: models.HttpFileStoreOptions): Promise<models.HttpFile>;
    private configureHooks;
}
