import * as core from '@actions/core'
import * as github from '@actions/github'
import {parseLockFile, type InstalledPackages} from './lockfile'
import {resolvePackage} from './package'
import {baseRefOfPull, fetchContent} from './github'
import {markdownTable} from 'markdown-table'
import {Cache} from './cache'
import replaceComment from '@aki77/actions-replace-comment'

let _cache: Cache
function cache(): Cache {
  if (!_cache) {
    _cache = new Cache(github.context.issue.number)
  }
  return _cache
}

async function fetchInstalledPackages(
  githubToken: string,
  path: string
): Promise<{current: InstalledPackages; previous?: InstalledPackages}> {
  const {owner, repo} = github.context.repo
  const head = github.context.ref
  const base = await baseRefOfPull(
    owner,
    repo,
    github.context.issue.number,
    githubToken
  )
  const [curr, prev] = await Promise.all([
    fetchContent(owner, repo, path, head, githubToken),
    fetchContent(owner, repo, path, base, githubToken)
  ])
  if (!curr) {
    throw new Error(`${path} is not found in ${head}`)
  }

  return {
    current: parseLockFile(curr, path),
    previous: prev ? parseLockFile(prev, path) : undefined
  }
}

type UpdatedPackage = {
  name: string
  currentVersion: string
  previousVersion?: string
}

function diff(
  currPkgs: InstalledPackages,
  prevPkgs?: InstalledPackages
): UpdatedPackage[] {
  const updatedPackages: UpdatedPackage[] = []
  for (const [key, currPkg] of currPkgs.entries()) {
    const prevPkg = prevPkgs?.get(key)
    if (!prevPkg || currPkg.version !== prevPkg.version) {
      updatedPackages.push({
        name: key,
        currentVersion: currPkg.version,
        previousVersion: prevPkg?.version
      })
    }
  }
  return updatedPackages
}

async function fetchChangelogUrls(
  packages: UpdatedPackage[],
  npmToken: string,
  githubToken: string
): Promise<Map<string, string>> {
  const pkgs = await Promise.all(
    packages.map(async pkg => resolvePackage(pkg.name, npmToken))
  )
  const urls = await Promise.all(
    pkgs.map(async pkg =>
      pkg
        ? cache().getChangelogUrlOrFind(pkg, githubToken)
        : Promise.resolve(undefined)
    )
  )
  const ret = new Map<string, string>()
  for (let i = 0; i < packages.length; ++i) {
    const url = urls[i]
    if (url) {
      const pkg = packages[i]
      ret.set(pkg.name, url)
    }
  }
  return ret
}

function generateReport(
  packages: UpdatedPackage[],
  urls: Map<string, string>
): string {
  return markdownTable([
    ['Package', 'Before', 'After', 'ChangeLog URL'],
    ...packages.map(({name, currentVersion, previousVersion}) => [
      name,
      previousVersion || '-',
      currentVersion,
      urls.get(name) || `https://www.npmjs.com/package/${name}`
    ])
  ])
}

async function postComment(text: string): Promise<void> {
  await replaceComment({
    token: core.getInput('githubToken'),
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.issue.number,
    body: `## Updated NPM Package ChangeLog URLs
${text}
`
  })
}

async function run(): Promise<void> {
  try {
    await cache().restore()

    const githubToken: string = core.getInput('githubToken')
    const path: string = core.getInput('lockPath')

    const {current, previous} = await fetchInstalledPackages(githubToken, path)
    const updates = diff(current, previous)

    const npmToken: string = core.getInput('npmToken')
    const changelogs = await fetchChangelogUrls(updates, npmToken, githubToken)

    await cache().save()

    const report = generateReport(updates, changelogs)
    await postComment(report)
  } catch (error) {
    core.debug(`unexpected error has occurred ${error}`)
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
