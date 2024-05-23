"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SORTED_FILENAMES = void 0;
const FILENAMES = {
    ['CHANGELOG.md']: 0,
    ['ChangeLog.md']: 0,
    ['Changelog.md']: 2,
    ['changelog.md']: 3,
    ['CHANGELOG.txt']: 2,
    ['ChangeLog.txt']: 3,
    ['Changelog.txt']: 3,
    ['changelog.txt']: 3,
    ['CHANGELOG.rdoc']: 4,
    ['ChangeLog.rdoc']: 4,
    ['Changelog.rdoc']: 4,
    ['changelog.rdoc']: 4,
    ['CHANGELOG']: 2,
    ['ChangeLog']: 2,
    ['Changelog']: 3,
    ['changelog']: 3,
    ['HISTORY.md']: 1,
    ['History.md']: 1,
    ['history.md']: 3,
    ['HISTORY.txt']: 2,
    ['History.txt']: 3,
    ['history.txt']: 3,
    ['HISTORY.rdoc']: 4,
    ['History.rdoc']: 2,
    ['history.rdoc']: 4,
    ['HISTORY']: 3,
    ['History']: 3,
    ['history']: 3,
    ['NEWS.md']: 1,
    ['News.md']: 2,
    ['news.md']: 3,
    ['NEWS.txt']: 3,
    ['News.txt']: 3,
    ['news.txt']: 3,
    ['NEWS.rdoc']: 4,
    ['News.rdoc']: 4,
    ['news.rdoc']: 4,
    ['NEWS']: 2,
    ['News']: 3,
    ['news']: 3,
    ['Releases']: 2
};
exports.SORTED_FILENAMES = Array.from(Object.entries(FILENAMES))
    .sort((a, b) => a[1] - b[1])
    .map(e => e[0]);
//# sourceMappingURL=changelog.js.map