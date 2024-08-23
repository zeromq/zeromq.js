"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = exports.toBool = void 0;
function toBool(value) {
    switch (value) {
        case "true":
        case "1":
            return true;
        case "false":
        case "0":
            return false;
        case undefined:
        case "":
            return undefined;
        default:
            throw new Error(`Invalid boolean value: ${value}`);
    }
}
exports.toBool = toBool;
function toString(value) {
    switch (value) {
        case undefined:
        case "":
            return undefined;
        default:
            return value;
    }
}
exports.toString = toString;
//# sourceMappingURL=utils.js.map