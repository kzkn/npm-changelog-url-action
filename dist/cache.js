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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const cache = __importStar(require("@actions/cache"));
class Cache {
    changelogCache;
    constructor(issueNumber) {
        this.changelogCache = new ChangelogCache(issueNumber);
    }
    async getChangelogUrlOrFind(pkg, githubToken) {
        return await this.changelogCache.getUrlOrFind(pkg, githubToken);
    }
    async restore() {
        Promise.all([this.changelogCache.restore()]);
    }
    async save() {
        Promise.all([this.changelogCache.save()]);
    }
}
exports.Cache = Cache;
class ChangelogCache {
    body;
    constructor(issueNumber) {
        this.body = new CacheBody('changelog', issueNumber);
    }
    async getUrlOrFind(pkg, token) {
        const { name } = pkg;
        if (this.body?.has(name)) {
            return this.body.get(name);
        }
        else {
            const gh = pkg.github(token);
            if (!gh) {
                return;
            }
            const changelog = await gh.getChangelogUrl();
            const url = changelog || gh.releaseUrl;
            if (url) {
                this.body?.set(name, url);
            }
            return url;
        }
    }
    async restore() {
        await this.body.load(raw => raw);
    }
    async save() {
        await this.body.save(value => value);
    }
}
class CacheBody {
    name;
    issueNumber;
    body;
    constructor(name, issueNumber) {
        this.name = name;
        this.issueNumber = issueNumber;
    }
    has(key) {
        return this.body?.has(key) || false;
    }
    get(key) {
        return this.body?.get(key);
    }
    set(key, value) {
        this.body?.set(key, value);
    }
    async load(mapper) {
        if (this.body) {
            return;
        }
        this.body = new Map();
        core.debug(`restore cache: ${this.filename}`);
        const hit = await cache.restoreCache([this.filename], this.cacheKey, [
            `${this.name}-`
        ]);
        core.debug(`cache hit: ${hit}`);
        if (!hit) {
            return;
        }
        const content = fs.readFileSync(this.filename);
        const data = JSON.parse(content.toString());
        for (const [k, v] of Object.entries(data)) {
            const value = mapper(v);
            this.body.set(k, value);
        }
    }
    async save(mapper) {
        if (!this.body) {
            return;
        }
        const data = {};
        for (const [k, v] of this.body.entries()) {
            data[k] = mapper(v);
        }
        fs.writeFileSync(this.filename, JSON.stringify(data));
        try {
            await cache.saveCache([this.filename], this.cacheKey);
        }
        catch (error) {
            const err = error;
            if (err.name === cache.ValidationError.name) {
                throw error;
            }
            else if (err.name === cache.ReserveCacheError.name) {
                core.info(err.message);
            }
            else {
                core.info(`[warning]${err.message}`);
            }
        }
    }
    get filename() {
        return `${this.name}.json`;
    }
    get cacheKey() {
        return `${this.name}-${this.issueNumber}`;
    }
}
//# sourceMappingURL=cache.js.map