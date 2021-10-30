import http, { IncomingMessage, ServerResponse } from 'http'
import { URL, URLSearchParams } from 'url'
import zlib from 'zlib'

class Timing {
	name: string
	desc?: string
	start: [number, number]
	elapsed: [number, number]
	stopped: boolean

	constructor(name: string, desc?: string) {
		this.name = name
		this.desc = desc
		this.elapsed = [0, 0]
		this.start = process.hrtime()
		this.stopped = false
	}
	stop() {
		this.elapsed = process.hrtime(this.start)
		this.stopped = true
	}
}

export class CustomResponse extends ServerResponse {
	Timings: {
		[name: string]: Timing
	}
	encoding: string
	responseSent: boolean

	constructor(req: IncomingMessage) {
		super(req)
		this.Timings = {}
		this.encoding = 'identity'
		this.responseSent = false
	}
	startTiming(name: string, desc?: string): void {
		if (this.Timings[name]) {
			throw Error('Timing already exists')
		}
		this.Timings[name] = new Timing(name, desc)
	}
	stopTiming(name: string): void {
		const t = this.Timings[name]
		if (!t) {
			throw Error('Timing not found')
		}
		t.stop()
	}
	sendTimings(): void {
		const TimingStrings: string[] = []
		for (const name in this.Timings) {
			const t = this.Timings[name]
			if (t) {
				if (!t.stopped) {
					t.stop()
				}
				const a: string[] = []
				a.push(t.name)
				if (t.desc) {
					a.push(`desc="${t.desc}"`)
				}
				const duration = (t.elapsed[0] * 1_000_000_000 + t.elapsed[1]) / 1_000_000
				a.push(`dur=${duration}`)
				TimingStrings.push(a.join(';'))
			}
		}
		if (TimingStrings.length > 0) {
			this.setHeader('Server-Timing', TimingStrings.join(', '))
		}
	}

	send(data?: string | Buffer): void {
		const code = this.statusCode || 200
		this.responseSent = true
		this.setHeader('Cache-Control', 'no-cache')
		if (!data) {
			this.sendTimings()
			this.writeHead(code, this.statusMessage || http.STATUS_CODES[code])
			this.end()
			return
		}
		this.startTiming('encoding', 'Data encoding')
		let CompressedData: Buffer | string | null = null
		if (data.length > 1024) {
			switch (this.encoding) {
				case 'gzip':
					CompressedData = zlib.gzipSync(data)
					this.setHeader('Content-Encoding', 'gzip')
					break
				case 'br':
					CompressedData = zlib.brotliCompressSync(data, {
						chunkSize: 32 * 1024,
						params: {
							[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
							[zlib.constants.BROTLI_PARAM_QUALITY]: 4,
							[zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
						},
					})
					this.setHeader('Content-Encoding', 'br')
					break
				case 'deflate':
					CompressedData = zlib.deflateSync(data)
					this.setHeader('Content-Encoding', 'deflate')
					break
				default:
					CompressedData = data
			}
		} else {
			CompressedData = data
		}
		this.stopTiming('encoding')
		this.sendTimings()
		this.setHeader('Content-Length', CompressedData.length)
		this.writeHead(code, this.statusMessage || http.STATUS_CODES[code])
		this.end(CompressedData)
	}
	status(code: number, message?: string): void {
		this.statusCode = code
		this.statusMessage = message ?? http.STATUS_CODES[code] ?? ''
	}
	json(data: Record<string, unknown>): void {
		const encoded = JSON.stringify(data, undefined, 4)
		this.setHeader('Content-Type', 'application/json')
		this.send(encoded)
	}
	sendSuccess<D>(data: D): void {
		this.status(200)
		this.json({ success: true, data })
	}
	sendError(code: number, message: string, info?: unknown): void {
		this.status(code)
		this.json({ success: false, code, message, additionalInfo: info })
	}
}
export class CustomRequest extends IncomingMessage {
	body!: Record<string, unknown>
	params!: Record<string, unknown>
	fullUrl!: URL
	querystring!: URLSearchParams
	ip!: string
}
