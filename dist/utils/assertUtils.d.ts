import { HttpResponse } from '../models';
export declare function assertStatusEquals(response: HttpResponse, status: number): void;
export declare function assertMaxTotalTime(response: HttpResponse, maxTotalTime: number): void;
export declare function assertHeaderEquals(response: HttpResponse, headerKey: string, val: string | string[] | undefined): void;
export declare function assertHeaderContains(response: HttpResponse, headerKey: string, val: string): void;
export declare function assertHasResponseBody(response: HttpResponse): void;
export declare function assertHasNoResponseBody(response: HttpResponse): void;
export declare function assertResponseBodyEquals(response: HttpResponse, val: unknown): void;
