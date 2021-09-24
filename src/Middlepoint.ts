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

export type MiddlepointFunction = (
	data: CustomRequest['params'],
	paths: string[],
	req: CustomRequest,
	res: CustomResponse,
) => unknown | Promise<unknown>

export interface MiddlepointData {
	[path: string]: Middlepoint
}

export interface MiddlepointSettings {
	[path: string]: Middlepoint | MiddlepointFunction | MiddlepointSettings
}

export class Middlepoint {
	data?: MiddlepointData
	func?: MiddlepointFunction

	constructor(func: MiddlepointFunction | MiddlepointSettings)
	constructor(func: MiddlepointFunction, data: MiddlepointSettings)
	constructor(func: MiddlepointFunction | MiddlepointSettings, data?: MiddlepointSettings) {
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
			this.data[path.toLowerCase()] = point instanceof Middlepoint ? point : new Middlepoint(point)
		}
	}

	getPoint(path: string): Middlepoint | undefined {
		return this.data && this.data[path.toLowerCase()]
	}
}
