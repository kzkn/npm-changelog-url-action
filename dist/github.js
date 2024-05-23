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
exports.Repository = exports.newGithub = exports.fetchContent = exports.baseRefOfPull = void 0;
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const changelog_1 = require("./changelog");
async function baseRefOfPull(owner, repo, pullNumber, token) {
    const octokit = (0, github_1.getOctokit)(token);
    const res = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
    });
    return res.data.base.ref;
}
exports.baseRefOfPull = baseRefOfPull;
async function fetchContent(owner, repo, path, ref, token) {
    const octokit = (0, github_1.getOctokit)(token);
    core.debug(`fetching ${owner}/${repo}/${path} at ${ref}`);
    try {
        const res = await octokit.rest.repos.getContent({ owner, repo, path, ref });
        core.debug(`content: ${JSON.stringify(res.data)}`);
        const content = res.data.content;
        if (content) {
            const buf = Buffer.from(content, 'base64');
            return buf.toString('utf-8');
        }
    }
    catch (error) {
        core.debug(`failed to fetch ${owner}/${repo}/${path} at ${ref}; ${error}`);
        if (error instanceof Error && error.name === 'HttpError') {
            return;
        }
        throw error;
    }
}
exports.fetchContent = fetchContent;
const REPO_URL_REGEXP = new RegExp('https://github.com/([^/]+)/([^#/]+)/?');
const TREE_URL_REGEXP = new RegExp('https://github.com/([^/]+)/([^/]+)/tree/[^/]+/(.+)$');
function newGithub(url, token) {
    if (url.match(REPO_URL_REGEXP)) {
        return Repository.fromUrl(url, token);
    }
    if (url.match(TREE_URL_REGEXP)) {
        return Tree.fromUrl(url, token);
    }
}
exports.newGithub = newGithub;
function findChangelogEntry(entries) {
    const entryMap = new Map();
    for (const entry of entries) {
        entryMap.set(entry.path, entry);
    }
    for (const path of changelog_1.SORTED_FILENAMES) {
        const entry = entryMap.get(path);
        if (entry?.type === 'blob')
            return entry;
    }
}
function normalizeRepoName(repo) {
    if (repo.endsWith('.git')) {
        return repo.slice(0, -4);
    }
    else {
        return repo;
    }
}
// NOTE: export for test
class Repository {
    owner;
    name;
    token;
    static fromUrl(url, token) {
        const [, owner, repo] = url.match(REPO_URL_REGEXP);
        core.debug(`github repository: ${url} ${owner} ${repo}`);
        return new Repository(owner, repo, token);
    }
    constructor(owner, name, token) {
        this.owner = owner;
        this.name = normalizeRepoName(name);
        this.token = token;
    }
    async getChangelogUrl() {
        const entries = await this.rootFileEntries();
        core.debug(`${this.name} entries: ${entries.length}`);
        const entry = findChangelogEntry(entries);
        if (!entry) {
            return;
        }
        try {
            const res = await this.octokit.rest.repos.getContent({
                owner: this.owner,
                repo: this.name,
                path: entry.path
            });
            return res.data.html_url;
        }
        catch (e) {
            core.debug(`failed to get content ${this.owner}/${this.name}/${entry.path}; ${e}`);
            return;
        }
    }
    get releaseUrl() {
        return `https://github.com/${this.owner}/${this.name}/releases`;
    }
    get octokit() {
        return (0, github_1.getOctokit)(this.token);
    }
    async rootFileEntries() {
        const branch = await this.defaultBranch();
        core.debug(`${this.name} default branch: ${branch}`);
        const res = await this.octokit.rest.git.getTree({
            owner: this.owner,
            repo: this.name,
            tree_sha: branch
        });
        return res.data.tree;
    }
    async defaultBranch() {
        const res = await this.octokit.rest.repos.get({
            owner: this.owner,
            repo: this.name
        });
        return res.data.default_branch;
    }
}
exports.Repository = Repository;
class Tree {
    static fromUrl(url, token) {
        const [, owner, repo, path] = url.match(TREE_URL_REGEXP);
        core.debug(`github tree: ${url} ${owner} ${repo} ${path}`);
        return new Tree(owner, repo, path, token);
    }
    owner;
    repo;
    path;
    token;
    constructor(owner, repo, path, token) {
        this.owner = owner;
        this.repo = normalizeRepoName(repo);
        this.path = path;
        this.token = token;
    }
    async getChangelogUrl() {
        const entries = await this.entries();
        return findChangelogEntry(entries)?.html_url;
    }
    get releaseUrl() {
        return `https://github.com/${this.owner}/${this.repo}/releases`;
    }
    get octokit() {
        return (0, github_1.getOctokit)(this.token);
    }
    async entries() {
        const defaultBranch = await this.defaultBranch();
        core.debug(`${this.repo} default branch: ${defaultBranch}`);
        const res = await this.octokit.rest.git.getTree({
            owner: this.owner,
            repo: this.repo,
            tree_sha: `${defaultBranch}:${this.path}`
        });
        core.debug(`tree entries: ${res.data.tree.length}`);
        return res.data.tree;
    }
    async defaultBranch() {
        const res = await this.octokit.rest.repos.get({
            owner: this.owner,
            repo: this.repo
        });
        return res.data.default_branch;
    }
}
//# sourceMappingURL=github.js.map