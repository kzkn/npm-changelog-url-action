import * as fs from 'fs'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import type { Package } from './package'

export class Cache {
  private changelogCache: ChangelogCache

  constructor(issueNumber: number) {
    this.changelogCache = new ChangelogCache(issueNumber)
  }

  async getChangelogUrlOrFind(
    pkg: Package,
    githubToken: string
  ): Promise<string | undefined> {
    return await this.changelogCache.getUrlOrFind(pkg, githubToken)
  }

  async restore() {
    Promise.all([
      this.changelogCache.restore()
    ])
  }

  async save() {
    Promise.all([
      this.changelogCache.save()
    ])
  }
}

class ChangelogCache {
  // TODO: move body to CachedJson
  private body: Map<string, string> | undefined
  private json: CachedJson

  constructor(issueNumber: number) {
    this.json = new CachedJson('changelog', issueNumber)
  }

  async getUrlOrFind(pkg: Package, token: string): Promise<string | undefined> {
    const { name } = pkg
    if (this.body?.has(name)) {
      return this.body.get(name)
    } else {
      const gh = pkg.github(token)
      if (!gh) { return }

      const changelog = await gh.getChangelogUrl()
      const url = changelog || gh.releaseUrl
      if (url) {
        this.body?.set(name, url)
      }
      return url
    }
  }

  async restore() {
    if (this.body) { return }

    this.body = new Map()
    const data = await this.json.load()
    for (const [k, v] of Object.entries(data)) {
      this.body.set(k, v)
    }
  }

  async save() {
    if (!this.body) { return }

    const data: { [key: string]: string } = {}
    for (const [k, v] of this.body.entries()) {
      data[k] = v
    }
    await this.json.save(data)
  }
}

class CachedJson {
  private name: string
  private issueNumber: number

  constructor(name: string, issueNumber: number) {
    this.name = name
    this.issueNumber = issueNumber
  }

  async load(): Promise<{ [key: string]: string }> {
    const hit = await cache.restoreCache([this.filename], this.cacheKey, [`${this.name}-`])
    if (!hit) { return {} }

    const content = fs.readFileSync(this.filename)
    return JSON.parse(content.toString()) as { [key: string]: string }
  }

  async save(data: { [key: string]: string }) {
    const content = JSON.stringify(data)
    fs.writeFileSync(this.filename, content)
    try {
      await cache.saveCache([this.filename], this.cacheKey)
    } catch (error) {
      const err = error as any
      if (err.name === cache.ValidationError.name) {
        throw error
      } else if (err.name === cache.ReserveCacheError.name) {
        core.info(err.message)
      } else {
        core.info(`[warning]${err.message}`)
      }
    }
  }

  get filename(): string {
    return `${this.name}.json`
  }

  get cacheKey(): string {
    return `${this.name}-${this.issueNumber}`
  }
}
