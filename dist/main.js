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
const fs_1 = require("fs");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const lockFile_1 = require("./lockFile");
const package_1 = require("./package");
const github_1 = require("./github");
const cache_1 = require("./cache");
const actions_replace_comment_1 = __importDefault(require("@aki77/actions-replace-comment"));
let _cache;
function cache() {
    if (!_cache) {
        _cache = new cache_1.Cache(github.context.issue.number);
    }
    return _cache;
}
async function fetchInstalledPackages(githubToken, lockPath) {
    const { owner, repo } = github.context.repo;
    const head = github.context.ref;
    const base = await (0, github_1.baseRefOfPull)(owner, repo, github.context.issue.number, githubToken);
    const [curr, prev] = await Promise.all([
        (0, github_1.fetchContent)(owner, repo, lockPath, head, githubToken),
        (0, github_1.fetchContent)(owner, repo, lockPath, base, githubToken)
    ]);
    if (!curr) {
        throw new Error(`${lockPath} is not found in ${head}`);
    }
    return {
        current: (0, lockFile_1.parseLockFile)(curr, lockPath),
        previous: prev ? (0, lockFile_1.parseLockFile)(prev, lockPath) : undefined
    };
}
function diff(currPkgs, prevPkgs) {
    const updatedPackages = [];
    for (const [key, currPkg] of currPkgs.entries()) {
        const prevPkg = prevPkgs?.get(key);
        if (!prevPkg || currPkg.version !== prevPkg.version) {
            updatedPackages.push({
                name: key,
                currentVersion: currPkg.version,
                previousVersion: prevPkg?.version
            });
        }
    }
    return updatedPackages;
}
async function fetchChangelogUrls(packages, npmToken, githubToken) {
    const pkgs = await Promise.all(packages.map(async (pkg) => (0, package_1.resolvePackage)(pkg.name, npmToken)));
    const urls = await Promise.all(pkgs.map(async (pkg) => pkg
        ? cache().getChangelogUrlOrFind(pkg, githubToken)
        : Promise.resolve(undefined)));
    const ret = new Map();
    for (let i = 0; i < packages.length; ++i) {
        const url = urls[i];
        if (url) {
            const pkg = packages[i];
            ret.set(pkg.name, url);
        }
    }
    return ret;
}
async function generateReport(packages, urls) {
    const { markdownTable } = await import('markdown-table');
    return markdownTable([
        ['Package', 'Before', 'After', 'ChangeLog URL'],
        ...packages.map(({ name, currentVersion, previousVersion }) => [
            name,
            previousVersion || '-',
            currentVersion,
            urls.get(name) || `https://www.npmjs.com/package/${name}`
        ])
    ]);
}
async function postComment(text) {
    await (0, actions_replace_comment_1.default)({
        token: core.getInput('githubToken'),
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.issue.number,
        body: `## Updated NPM Package ChangeLog URLs
${text}
`
    });
}
async function getSpecifiedPackages(file) {
    const fileContent = await fs_1.promises.readFile(file, {
        encoding: 'utf8'
    });
    const content = JSON.parse(fileContent);
    core.debug(`content: ${content}`);
    return [
        ...(content?.dependencies ? Object.keys(content.dependencies) : []),
        ...(content?.devDependencies ? Object.keys(content.devDependencies) : [])
    ];
}
async function filterSpecifiedPackages(updates) {
    // TODO: Refer to the same directory as lockPath
    const specifiedPackages = await getSpecifiedPackages('./package.json');
    return updates.filter(({ name }) => specifiedPackages.includes(name));
}
async function run() {
    try {
        await cache().restore();
        const githubToken = core.getInput('githubToken');
        const lockPath = core.getInput('lockPath');
        core.debug(`lockPath: ${lockPath}`);
        const { current, previous } = await fetchInstalledPackages(githubToken, lockPath);
        core.debug(`current: ${current}, previous: ${previous}`);
        const updates = diff(current, previous);
        const onlySpecifiedPackages = core.getInput('onlySpecifiedPackages');
        const filteredUpdates = onlySpecifiedPackages === 'true'
            ? await filterSpecifiedPackages(updates)
            : updates;
        const npmToken = core.getInput('npmToken');
        const changelogs = await fetchChangelogUrls(filteredUpdates, npmToken, githubToken);
        await cache().save();
        const report = await generateReport(filteredUpdates, changelogs);
        await postComment(report);
    }
    catch (error) {
        const errorMessage = `Unexpected error has occurred: ${error}`;
        core.debug(errorMessage);
        if (error instanceof Error) {
            core.setFailed(`${errorMessage}\n${error.stack}`);
        }
    }
}
run();
//# sourceMappingURL=main.js.map