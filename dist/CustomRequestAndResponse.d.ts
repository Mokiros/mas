/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { URL, URLSearchParams } from 'url';
declare class Timing {
    name: string;
    desc?: string;
    start: [number, number];
    elapsed: [number, number];
    stopped: boolean;
    constructor(name: string, desc?: string);
    stop(): void;
}
export declare class CustomResponse extends ServerResponse {
    Timings: {
        [name: string]: Timing;
    };
    encoding: string;
    responseSent: boolean;
    constructor(req: IncomingMessage);
    startTiming(name: string, desc?: string): void;
    stopTiming(name: string): void;
    sendTimings(): void;
    send(data?: string | Buffer): void;
    status(code: number, message?: string): void;
    json(data: Record<string, unknown>): void;
    sendSuccess<D>(data: D): void;
    sendError(code: number, message: string, info?: unknown): void;
}
export declare class CustomRequest extends IncomingMessage {
    body: Record<string, unknown>;
    params: Record<string, unknown>;
    fullUrl: URL;
    querystring: URLSearchParams;
    ip: string;
}
export {};
