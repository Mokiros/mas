import { URL } from 'url'
import { MiddlepointError, Middlepoint } from './Middlepoint'
import { CustomRequest, CustomResponse } from './CustomRequestAndResponse'

type Middleware = (req: CustomRequest, res: CustomResponse) => void | Promise<void>

let first_middlepoint: Middlepoint | undefined

const middlewares: Middleware[] = [
	(req) => {
		const url = new URL(req.url ?? '/', 'https://' + (req.headers['host'] ?? process.env.API_DOMAIN ?? 'local.dev'))
		req.fullUrl = url
		req.ip =
			(req.headers['cf-connecting-ip'] as string | undefined) ||
			(req.headers['x-forwarded-for'] as string | undefined) ||
			req.socket.remoteAddress ||
			'0.0.0.0'
	},

	(req, res) => {
		const EncoderPriority: { [encoder: string]: number } = {
			gzip: 1,
			deflate: 2,
			br: 3,
		}

		res.startTiming('encparse', 'Encoding parsing')
		const check = /([a-z*]+)(?:; ?q=([0-9.]+)|)(?:,|$)/gi
		const encodings = req.headers['accept-encoding'] as string
		let encoding = null
		let highest = 0
		let current
		while ((current = check.exec(encodings))) {
			const enc = current[1]
			if (!enc) {
				continue
			}
			const priority = EncoderPriority[enc]
			if (!priority) {
				continue
			}
			const num = (current[2] !== undefined && parseFloat(current[2])) || priority
			if (!encoding || num > highest) {
				encoding = enc
				highest = num
			}
		}
		if (encoding) {
			res.encoding = encoding
		}
		res.stopTiming('encparse')
	},

	(req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
		res.setHeader('Access-Control-Allow-Headers', '*')
		res.setHeader('Access-Control-Max-Age', '300')
		if (req.method === 'OPTIONS') {
			res.setHeader('Content-Length', '0')
			res.status(204)
			res.send()
			return
		}
	},

	(req) => {
		const method = req.method?.toLowerCase()
		if (!method || (method !== 'get' && method !== 'post' && method !== 'options')) {
			throw new MiddlepointError('Invalid method', 400)
		}
	},

	(req) => {
		if (req.method !== 'POST') {
			return
		}

		return new Promise((resolve, reject) => {
			const Chunks: Buffer[] = []
			let TotalLength = 0
			req.on('data', (chunk: Buffer) => {
				Chunks.push(chunk)
				TotalLength += chunk.length
			})
			req.on('end', () => {
				const data = Buffer.concat(Chunks, TotalLength)
				const type = req.headers['content-type']
				switch (type) {
					case 'application/json':
						try {
							const parsed = JSON.parse(data.toString('utf8'))
							req.body = parsed
							resolve()
						} catch (e) {
							reject(e)
						}
						break
					default:
						reject(new MiddlepointError('Unsupported content-type', 400))
				}
			})
		})
	},

	(req) => {
		const params: CustomRequest['params'] = {}
		req.fullUrl.searchParams.forEach((value, key) => {
			params[key] = value
		})
		Object.assign(params, req.body)
		req.params = params
	},

	async (req, res) => {
		if (!first_middlepoint) {
			throw Error("Middlepoint wasn't registered")
		}
		const paths = req.fullUrl.pathname.split('/')
		if (paths[0] === '') {
			paths.shift()
		}
		let middlepoint: Middlepoint | undefined
		let path: string | undefined
		let middlepointCounter = 0
		while ((path = middlepoint ? paths.shift() : '') !== undefined) {
			middlepointCounter++
			const point = middlepoint ? middlepoint.getPoint(path) : first_middlepoint
			if (!point) {
				throw new MiddlepointError('Endpoint not found', 404)
			}
			middlepoint = point
			const func = point.func
			if (!func) {
				continue
			}
			const timingName = `mp${middlepointCounter}`
			res.startTiming(timingName, `Middlepoint ${middlepointCounter}`)
			let response = func(req.params, paths, req, res)
			if (response instanceof Promise) {
				response = await response
			}
			if (res.responseSent) {
				break
			}
			if (response !== undefined) {
				res.stopTiming(timingName)
				res.sendSuccess(response)
				break
			}
		}
	},

	() => {
		throw new MiddlepointError('Endpoint not found', 404)
	},
]

async function Preprocessor(req: CustomRequest, res: CustomResponse): Promise<void> {
	res.startTiming('res', 'Total request processing time')
	let i = 0
	for (const middleware of middlewares) {
		if (res.responseSent) {
			break
		}
		try {
			const cur_i = i++
			res.startTiming(`mw${cur_i}`, 'Middleware ' + cur_i)
			const p = middleware(req, res)
			if (p instanceof Promise) {
				await p
			}
			res.stopTiming(`mw${cur_i}`)
		} catch (e) {
			if (typeof e === 'string') {
				res.sendError(500, e)
			} else if (e instanceof Error) {
				if (e instanceof MiddlepointError) {
					res.sendError(e.code, e.message, e.additionalInfo)
				} else {
					console.error(e)
					res.sendError(500, e.stack ?? e.message)
				}
			} else {
				console.error(e)
				res.sendError(500, 'Unknown endpoint error')
			}
		}
	}
}

function RegisterMiddlepoint(middlepoint: Middlepoint): void {
	first_middlepoint = middlepoint
}

export { RegisterMiddlepoint }
export default Preprocessor
