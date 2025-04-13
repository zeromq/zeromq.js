"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_1 = require("cmake-ts/build/loader");
const path_1 = __importDefault(require("path"));
const addon = (0, loader_1.loadAddon)(path_1.default.resolve(__dirname, "..", "build"));
exports.default = addon;
//# sourceMappingURL=load-addon.js.map