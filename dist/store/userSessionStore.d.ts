import { Dispose, SessionStore, UserSession } from '../models';
export declare class UserSessionStore implements SessionStore {
    readonly userSessions: Array<UserSession>;
    private readonly sessionChangedListener;
    onSessionChanged(listener: () => void): Dispose;
    reset(): Promise<void>;
    getUserSession<T extends UserSession>(id: string): T | undefined;
    setUserSession<T extends UserSession>(userSession: T): void;
    private notifySessionChanged;
    removeUserSession(id: string): void;
    isUserSession(obj: unknown): obj is UserSession;
}
export declare const userSessionStore: UserSessionStore;
