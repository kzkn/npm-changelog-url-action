"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.parsePnpmLockFile = exports.parseYarnLockFile = exports.parseLockFile = void 0;
const yarnLockfile = __importStar(require("@yarnpkg/lockfile"));
const js_yaml_1 = __importDefault(require("js-yaml"));
function parseLockFile(text, path) {
    if (path.endsWith('yarn.lock')) {
        return parseYarnLockFile(text);
    }
    else if (path.endsWith('pnpm-lock.yaml')) {
        return parsePnpmLockFile(text);
    }
    else {
        throw new Error(`Invalid lock file path: ${path}`);
    }
}
exports.parseLockFile = parseLockFile;
function parseYarnLockFile(text) {
    const { object: content } = yarnLockfile.parse(text);
    const pkgs = new Map();
    for (const key of Object.keys(content)) {
        const parts = key.split('@');
        const name = parts[0] === '' ? `@${parts[1]}` : parts[0];
        pkgs.set(name, {
            name,
            version: content[key].version
        });
    }
    return pkgs;
}
exports.parseYarnLockFile = parseYarnLockFile;
function parsePnpmLockFile(text) {
    const lockfileFile = js_yaml_1.default.load(text);
    const pkgs = new Map();
    if (!lockfileFile.packages)
        return pkgs;
    const lockfileVersion = typeof lockfileFile.lockfileVersion === 'string'
        ? Number.parseFloat(lockfileFile.lockfileVersion)
        : lockfileFile.lockfileVersion;
    for (const key of Object.keys(lockfileFile.packages)) {
        const { name, version } = parsePnpmPackageKey(key, lockfileVersion);
        pkgs.set(name, {
            name,
            version
        });
    }
    return pkgs;
}
exports.parsePnpmLockFile = parsePnpmLockFile;
function parsePnpmPackageKey(key, lockfileVersion) {
    if (lockfileVersion >= 9) {
        // Example: @popperjs/core@2.11.8
        const parts = key.split('@');
        const version = parts[parts.length - 1];
        const name = parts.slice(0, -1).join('@');
        return { name, version };
    }
    else {
        // Example: /@popperjs/core/2.11.5
        const parts = key.split('_')[0].split('/');
        const name = parts.slice(1, -1).join('/');
        const version = parts.slice(-1)[0];
        return { name, version };
    }
}
//# sourceMappingURL=lockFile.js.map