import {getOctokit} from '@actions/github'
import {SORTED_FILENAMES} from './changelog'

export async function fetchCurrentAndPreviousContent(
  owner: string,
  repo: string,
  path: string,
  head: string,
  pullNumber: number,
  token: string
): Promise<[string, string?]> {
  const octokit = getOctokit(token)
  const res = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })
  const base = res.data.base.ref

  async function contentOf(ref: string): Promise<string | undefined> {
    const res = await octokit.rest.repos.getContent({owner, repo, path, ref})
    const content = (res.data as any).content
    if (content) {
      const buf = Buffer.from(content as string, 'base64')
      return buf.toString('utf-8')
    }
  }

  const [curr, prev] = await Promise.all([contentOf(head), contentOf(base)])
  return [curr!!, prev]
}

const REPO_URL_REGEXP = new RegExp('^https://github.com/([^/]+)/([^/]+)/?$')
const TREE_URL_REGEXP = new RegExp(
  '^https://github.com/([^/]+)/([^/]+)/tree/[^/]+/(.+)$'
)

type Github = {
  getChangelogUrl(): Promise<string | undefined>
  releaseUrl: string
}

type FileEntry = {
  path: string
  url: string
  type: 'blob' | 'tree'
}

export function newGithub(url: string, token: string): Github | undefined {
  if (url.match(REPO_URL_REGEXP)) {
    return Repository.fromUrl(url, token)
  }
  if (url.match(TREE_URL_REGEXP)) {
    return Tree.fromUrl(url, token)
  }
}

function findChangelogEntry(entries: FileEntry[]): FileEntry | undefined {
  const entryMap = new Map()
  entries.forEach(entry => entryMap.set(entry.path, entry))

  for (const path of SORTED_FILENAMES) {
    const entry = entryMap.get(path)
    if (entry?.type === 'blob') return entry
  }
}

function normalizeRepoName(repo: string): string {
  if (repo.endsWith('.git')) {
    return repo.slice(0, -4)
  } else {
    return repo
  }
}

class Repository {
  private owner: string
  private name: string
  private token: string

  static fromUrl(url: string, token: string): Repository {
    const [, owner, repo] = url.match(REPO_URL_REGEXP) as string[]
    console.log(`github repository: ${url} ${owner} ${repo}`)
    return new Repository(owner, repo, token)
  }

  constructor(owner: string, name: string, token: string) {
    this.owner = owner
    this.name = normalizeRepoName(name)
    this.token = token
  }

  async getChangelogUrl(): Promise<string | undefined> {
    const entries = await this.rootFileEntries()
    return findChangelogEntry(entries)?.url
  }

  get releaseUrl(): string {
    return `https://github.com/${this.owner}/${this.name}/releases`
  }

  get octokit(): ReturnType<typeof getOctokit> {
    return getOctokit(this.token)
  }

  async rootFileEntries(): Promise<FileEntry[]> {
    const branch = await this.defaultBranch()
    const res = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.name,
      tree_sha: branch
    })
    return res.data.tree as FileEntry[]
  }

  async defaultBranch(): Promise<string> {
    const res = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.name,
    })
    return res.data.default_branch
  }
}

class Tree {
  static fromUrl(url: string, token: string): Tree {
    const [, owner, repo, path] = url.match(TREE_URL_REGEXP) as string[]
    console.log(`github tree: ${url} ${owner} ${repo} ${path}`)
    return new Tree(owner, repo, path, token)
  }

  private owner: string
  private repo: string
  private path: string
  private token: string

  constructor(owner: string, repo: string, path: string, token: string) {
    this.owner = owner
    this.repo = normalizeRepoName(repo)
    this.path = path
    this.token = token
  }

  async getChangelogUrl(): Promise<string | undefined> {
    const entries = await this.entries()
    return findChangelogEntry(entries)?.url
  }

  get releaseUrl(): string {
    return `https://github.com/${this.owner}/${this.repo}/releases`
  }

  get octokit(): ReturnType<typeof getOctokit> {
    return getOctokit(this.token)
  }

  async entries(): Promise<FileEntry[]> {
    const defaultBranch = await this.defaultBranch()
    const res = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: `${defaultBranch}:${this.path}`
    })
    return res.data.tree as FileEntry[]
  }

  async defaultBranch(): Promise<string> {
    const res = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo
    })
    return res.data.default_branch
  }
}
