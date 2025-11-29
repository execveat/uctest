import { ConfigureHooks, EnvironmentConfig, PathLike } from '../models';
export declare function getHttpyacConfig(filename: PathLike, rootDir: PathLike | undefined): Promise<EnvironmentConfig | undefined>;
export declare const defaultConfigFiles: string[];
export declare function parseJson<T>(fileName: PathLike): Promise<T | undefined>;
export declare function resolveClientCertificates(config: EnvironmentConfig, rootDir: PathLike): Promise<void>;
export declare function getPlugins(rootDir: PathLike): Promise<Record<string, ConfigureHooks>>;
