import { HttpResponse, StreamResponse } from './httpResponse';
export type RequestClientResponse = undefined | void | HttpResponse;
export interface RequestClient<T = unknown> {
    readonly supportsStreaming: boolean;
    getSessionId?(): string;
    reportMessage: string;
    nativeClient: T;
    connect(obj: T | undefined): Promise<T>;
    send(body?: unknown): Promise<void>;
    /**
     * called after onStreaming finished using this client
     */
    streamEnded?(): void;
    disconnect(err?: Error): void;
    addEventListener<K extends keyof RequestClientEventMap>(type: K, listener: (ev: RequestClientEvent<RequestClientEventMap[K]>) => void): void;
    removeEventListener<K extends keyof RequestClientEventMap>(type: K, listener: (ev: RequestClientEvent<RequestClientEventMap[K]>) => void): void;
    triggerEnd(): void;
}
interface RequestClientEventMap {
    progress: number;
    message: [string, HttpResponse & StreamResponse];
    metaData: [string, HttpResponse & StreamResponse];
    disconnect: void;
    end: void;
}
export declare class RequestClientEvent<T = undefined> extends Event {
    readonly detail: T;
    constructor(message: string, detail: T);
}
export declare abstract class AbstractRequestClient<T> implements RequestClient<T> {
    abstract readonly supportsStreaming: boolean;
    abstract disconnect(err?: Error): void;
    abstract nativeClient: T;
    abstract reportMessage: string;
    abstract connect(obj: T | undefined): Promise<T>;
    abstract send(body?: unknown): Promise<void>;
    private eventEmitter;
    addEventListener<K extends keyof RequestClientEventMap>(type: K, listener: (evt: RequestClientEvent<RequestClientEventMap[K]>) => void): void;
    removeEventListener<K extends keyof RequestClientEventMap>(type: K, listener: (evt: RequestClientEvent<RequestClientEventMap[K]>) => void): void;
    private isRequestClientEvent;
    protected onMessage(type: string, response: HttpResponse & StreamResponse): void;
    protected onProgress(percent: number): void;
    protected onMetaData(type: string, response: HttpResponse & StreamResponse): void;
    protected onDisconnect(): void;
    triggerEnd(): void;
}
export {};
