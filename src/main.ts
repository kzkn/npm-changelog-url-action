import * as core from '@actions/core'
import * as github from '@actions/github'
import {YarnLockFile} from './yarnlock'
import {resolvePackage} from './package'
import {fetchCurrentAndPreviousContent} from './github'
import {markdownTable} from 'markdown-table'
import replaceComment from '@aki77/actions-replace-comment'

async function fetchYarnLockFiles(
  githubToken: string,
  path: string
): Promise<{current: YarnLockFile; previous?: YarnLockFile}> {
  const {owner, repo} = github.context.repo
  const head = github.context.ref
  const pull = github.context.issue.number
  const [curr, prev] = await fetchCurrentAndPreviousContent(owner, repo, path, head, pull, githubToken)

  return {
    current: YarnLockFile.parse(curr),
    previous: prev ? YarnLockFile.parse(prev) : undefined
  }
}

type UpdatedPackage = {
  name: string
  currentVersion: string
  previousVersion?: string
}

function diff(current: YarnLockFile, previous?: YarnLockFile): UpdatedPackage[] {
  const updatedPackages: UpdatedPackage[] = []
  const currPkgs = current.installedPackages()
  const prevPkgs = previous?.installedPackages() || new Map()
  for (const [key, currPkg] of currPkgs.entries()) {
    const prevPkg = prevPkgs.get(key)
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
    packages.map(pkg => resolvePackage(pkg.name, npmToken))
  )
  const urls = await Promise.all(
    pkgs
      .map(pkg => pkg?.github(githubToken))
      .map(async github => {
        const changelog = await github?.getChangelogUrl()
        return changelog || github?.releaseUrl
      })
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
    const githubToken: string = core.getInput('githubToken')
    const path: string = core.getInput('yarnLockPath')

    const {current, previous} = await fetchYarnLockFiles(githubToken, path)
    const updates = diff(current, previous)

    const npmToken: string = core.getInput('npmToken')
    const changelogs = await fetchChangelogUrls(updates, npmToken, githubToken)

    const report = generateReport(updates, changelogs)
    await postComment(report)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
