import {promises as fs} from 'fs'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {parseLockFile, type InstalledPackages} from './lockFile'
import {resolvePackage} from './package'
import {baseRefOfPull, fetchContent} from './github'
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
  lockPath: string
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
    fetchContent(owner, repo, lockPath, head, githubToken),
    fetchContent(owner, repo, lockPath, base, githubToken)
  ])
  if (!curr) {
    throw new Error(`${lockPath} is not found in ${head}`)
  }

  return {
    current: parseLockFile(curr, lockPath),
    previous: prev ? parseLockFile(prev, lockPath) : undefined
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
  packages: readonly UpdatedPackage[],
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

async function generateReport(
  packages: readonly UpdatedPackage[],
  urls: Map<string, string>
): Promise<string> {
  const {markdownTable} = await import('markdown-table')

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

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

async function getSpecifiedPackages(file: string): Promise<readonly string[]> {
  const fileContent = await fs.readFile(file, {
    encoding: 'utf8'
  })

  const content = JSON.parse(fileContent) as PackageJson
  core.debug(`content: ${content}`)
  return [
    ...(content?.dependencies ? Object.keys(content.dependencies) : []),
    ...(content?.devDependencies ? Object.keys(content.devDependencies) : [])
  ]
}

async function filterSpecifiedPackages(
  updates: readonly UpdatedPackage[]
): Promise<readonly UpdatedPackage[]> {
  // TODO: Refer to the same directory as lockPath
  const specifiedPackages = await getSpecifiedPackages('./package.json')
  return updates.filter(({name}) => specifiedPackages.includes(name))
}

async function run(): Promise<void> {
  try {
    await cache().restore()

    const githubToken: string = core.getInput('githubToken')
    const lockPath: string = core.getInput('lockPath')

    core.debug(`lockPath: ${lockPath}`)
    const {current, previous} = await fetchInstalledPackages(
      githubToken,
      lockPath
    )
    core.debug(`current: ${current}, previous: ${previous}`)

    const updates = diff(current, previous)

    const onlySpecifiedPackages = core.getInput('onlySpecifiedPackages')
    const filteredUpdates =
      onlySpecifiedPackages === 'true'
        ? await filterSpecifiedPackages(updates)
        : updates

    const npmToken: string = core.getInput('npmToken')
    const changelogs = await fetchChangelogUrls(
      filteredUpdates,
      npmToken,
      githubToken
    )

    await cache().save()

    const report = await generateReport(filteredUpdates, changelogs)
    await postComment(report)
  } catch (error) {
    const errorMessage = `Unexpected error has occurred: ${error}`
    core.debug(errorMessage)
    if (error instanceof Error) {
      core.setFailed(`${errorMessage}\n${error.stack}`)
    }
  }
}

run()
