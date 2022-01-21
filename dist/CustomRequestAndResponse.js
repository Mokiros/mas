"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRequest = exports.CustomResponse = void 0;
const http_1 = __importStar(require("http"));
const zlib_1 = __importDefault(require("zlib"));
class Timing {
    name;
    desc;
    start;
    elapsed;
    stopped;
    constructor(name, desc) {
        this.name = name;
        this.desc = desc;
        this.elapsed = [0, 0];
        this.start = process.hrtime();
        this.stopped = false;
    }
    stop() {
        this.elapsed = process.hrtime(this.start);
        this.stopped = true;
    }
}
class CustomResponse extends http_1.ServerResponse {
    Timings;
    encoding;
    responseSent;
    constructor(req) {
        super(req);
        this.Timings = {};
        this.encoding = 'identity';
        this.responseSent = false;
    }
    startTiming(name, desc) {
        if (this.Timings[name]) {
            throw Error('Timing already exists');
        }
        this.Timings[name] = new Timing(name, desc);
    }
    stopTiming(name) {
        const t = this.Timings[name];
        if (!t) {
            throw Error('Timing not found');
        }
        t.stop();
    }
    sendTimings() {
        const TimingStrings = [];
        for (const name in this.Timings) {
            const t = this.Timings[name];
            if (t) {
                if (!t.stopped) {
                    t.stop();
                }
                const a = [];
                a.push(t.name);
                if (t.desc) {
                    a.push(`desc="${t.desc}"`);
                }
                const duration = (t.elapsed[0] * 1_000_000_000 + t.elapsed[1]) / 1_000_000;
                a.push(`dur=${duration}`);
                TimingStrings.push(a.join(';'));
            }
        }
        if (TimingStrings.length > 0) {
            this.setHeader('Server-Timing', TimingStrings.join(', '));
        }
    }
    send(data) {
        const code = this.statusCode || 200;
        this.responseSent = true;
        this.setHeader('Cache-Control', 'no-cache');
        if (!data) {
            this.sendTimings();
            this.writeHead(code, this.statusMessage || http_1.default.STATUS_CODES[code]);
            this.end();
            return;
        }
        this.startTiming('encoding', 'Data encoding');
        let CompressedData = null;
        if (data.length > 1024) {
            switch (this.encoding) {
                case 'gzip':
                    CompressedData = zlib_1.default.gzipSync(data);
                    this.setHeader('Content-Encoding', 'gzip');
                    break;
                case 'br':
                    CompressedData = zlib_1.default.brotliCompressSync(data, {
                        chunkSize: 32 * 1024,
                        params: {
                            [zlib_1.default.constants.BROTLI_PARAM_MODE]: zlib_1.default.constants.BROTLI_MODE_TEXT,
                            [zlib_1.default.constants.BROTLI_PARAM_QUALITY]: 4,
                            [zlib_1.default.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
                        },
                    });
                    this.setHeader('Content-Encoding', 'br');
                    break;
                case 'deflate':
                    CompressedData = zlib_1.default.deflateSync(data);
                    this.setHeader('Content-Encoding', 'deflate');
                    break;
                default:
                    CompressedData = data;
            }
        }
        else {
            CompressedData = data;
        }
        this.stopTiming('encoding');
        this.sendTimings();
        this.setHeader('Content-Length', CompressedData.length);
        this.writeHead(code, this.statusMessage || http_1.default.STATUS_CODES[code]);
        this.end(CompressedData);
    }
    status(code, message) {
        this.statusCode = code;
        this.statusMessage = message ?? http_1.default.STATUS_CODES[code] ?? '';
    }
    json(data) {
        const encoded = JSON.stringify(data, undefined, 4);
        this.setHeader('Content-Type', 'application/json');
        this.send(encoded);
    }
    sendSuccess(data) {
        this.status(200);
        this.json({ success: true, data });
    }
    sendError(code, message, info) {
        this.status(code);
        this.json({ success: false, code, message, additionalInfo: info });
    }
}
exports.CustomResponse = CustomResponse;
class CustomRequest extends http_1.IncomingMessage {
    body;
    params;
    fullUrl;
    querystring;
    ip;
}
exports.CustomRequest = CustomRequest;
