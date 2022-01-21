import { CustomResponse, CustomRequest } from './CustomRequestAndResponse';
export declare class MiddlepointError extends Error {
    code: number;
    additionalInfo?: unknown;
    constructor(message: string, code?: number, info?: unknown);
}
declare type Params = Record<string, unknown>;
export declare type MiddlepointFunction<P extends Params = Params> = (data: P, paths: string[], req: CustomRequest, res: CustomResponse) => unknown | Promise<unknown>;
export interface MiddlepointData<P extends Params = Params> {
    [path: string]: Middlepoint<P, P>;
}
export interface MiddlepointSettings<P extends Params = Params> {
    [path: string]: Middlepoint<P, P> | MiddlepointFunction<P> | MiddlepointSettings<P>;
}
export declare class Middlepoint<P extends Params = Params, PP extends Params = Params> {
    data?: MiddlepointData<P>;
    func?: MiddlepointFunction<PP>;
    constructor(func: MiddlepointFunction<PP> | MiddlepointSettings<P>);
    constructor(func: MiddlepointFunction<PP>, data: MiddlepointSettings<P>);
    getPoint(path: string): Middlepoint<P, P> | undefined;
}
export {};
