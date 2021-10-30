import { CustomResponse, CustomRequest } from './CustomRequestAndResponse'

export class MiddlepointError extends Error {
	code: number
	additionalInfo?: unknown

	constructor(message: string, code = 500, info?: unknown) {
		super(message)
		this.code = code
		this.additionalInfo = info
	}
}

type Params = Record<string, unknown>

export type MiddlepointFunction<P extends Params = Params> = (
	data: P,
	paths: string[],
	req: CustomRequest,
	res: CustomResponse,
) => unknown | Promise<unknown>

export interface MiddlepointData<P extends Params = Params> {
	[path: string]: Middlepoint<P, P>
}

export interface MiddlepointSettings<P extends Params = Params> {
	[path: string]: Middlepoint<P, P> | MiddlepointFunction<P> | MiddlepointSettings<P>
}

export class Middlepoint<P extends Params = Params, PP extends Params = Params> {
	data?: MiddlepointData<P>
	func?: MiddlepointFunction<PP>

	constructor(func: MiddlepointFunction<PP> | MiddlepointSettings<P>)
	constructor(func: MiddlepointFunction<PP>, data: MiddlepointSettings<P>)
	constructor(func: MiddlepointFunction<PP> | MiddlepointSettings<P>, data?: MiddlepointSettings<P>) {
		if (typeof func === 'function') {
			this.func = func
			if (!data) {
				return
			}
		} else {
			data = func
		}
		this.data = {}
		for (const path in data) {
			const point = data[path]
			if (!path || !point) {
				continue
			}
			this.data[path.toLowerCase()] = point instanceof Middlepoint ? point : new Middlepoint<P,P>(point)
		}
	}

	getPoint(path: string): Middlepoint<P, P> | undefined {
		return this.data && this.data[path.toLowerCase()]
	}
}
