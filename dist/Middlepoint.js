"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middlepoint = exports.MiddlepointError = void 0;
class MiddlepointError extends Error {
    code;
    additionalInfo;
    constructor(message, code = 500, info) {
        super(message);
        this.code = code;
        this.additionalInfo = info;
    }
}
exports.MiddlepointError = MiddlepointError;
class Middlepoint {
    data;
    func;
    constructor(func, data) {
        if (typeof func === 'function') {
            this.func = func;
            if (!data) {
                return;
            }
        }
        else {
            data = func;
        }
        this.data = {};
        for (const path in data) {
            const point = data[path];
            if (!path || !point) {
                continue;
            }
            this.data[path.toLowerCase()] = point instanceof Middlepoint ? point : new Middlepoint(point);
        }
    }
    getPoint(path) {
        return this.data && this.data[path.toLowerCase()];
    }
}
exports.Middlepoint = Middlepoint;
