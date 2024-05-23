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
exports.Package = exports.resolvePackage = void 0;
const core = __importStar(require("@actions/core"));
const npm_registry_fetch_1 = __importDefault(require("npm-registry-fetch"));
const github_1 = require("./github");
async function resolvePackage(name, npmToken) {
    try {
        const npmInfo = await npm_registry_fetch_1.default.json(name, { token: npmToken });
        return new Package(name, npmInfo);
    }
    catch (e) {
        core.debug(`failed to fetch npm package info: ${name}, ${e}`);
    }
}
exports.resolvePackage = resolvePackage;
class Package {
    name;
    info;
    constructor(name, info) {
        this.name = name;
        this.info = info;
    }
    github(githubToken) {
        const { repository } = this.info;
        if (repository && repository.url) {
            core.debug(`npm package: name=${this.name} repo=${repository.url}`);
            return (0, github_1.newGithub)(repository.url, githubToken);
        }
        else {
            core.debug(`npm package: no repository name=${this.name} repo=${repository} url=${repository?.url}`);
        }
    }
}
exports.Package = Package;
//# sourceMappingURL=package.js.map