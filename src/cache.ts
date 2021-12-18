import * as fs from 'fs'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import type {Package} from './package'

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
    Promise.all([this.changelogCache.restore()])
  }

  async save() {
    Promise.all([this.changelogCache.save()])
  }
}

class ChangelogCache {
  private body: CacheBody<string>

  constructor(issueNumber: number) {
    this.body = new CacheBody('changelog', issueNumber)
  }

  async getUrlOrFind(pkg: Package, token: string): Promise<string | undefined> {
    const {name} = pkg
    if (this.body?.has(name)) {
      return this.body.get(name)
    } else {
      const gh = pkg.github(token)
      if (!gh) {
        return
      }

      const changelog = await gh.getChangelogUrl()
      const url = changelog || gh.releaseUrl
      if (url) {
        this.body?.set(name, url)
      }
      return url
    }
  }

  async restore() {
    await this.body.load(raw => raw as string)
  }

  async save() {
    await this.body.save(value => value)
  }
}

class CacheBody<T> {
  private name: string
  private issueNumber: number
  private body: Map<string, T> | undefined

  constructor(name: string, issueNumber: number) {
    this.name = name
    this.issueNumber = issueNumber
  }

  has(key: string): boolean {
    return this.body!.has(key)
  }

  get(key: string): T | undefined {
    return this.body!.get(key)
  }

  set(key: string, value: T) {
    this.body!.set(key, value)
  }

  async load(mapper: (raw: unknown) => T) {
    if (this.body) {
      return
    }

    this.body = new Map()
    const hit = await cache.restoreCache([this.filename], this.cacheKey, [
      `${this.name}-`
    ])
    if (!hit) {
      return {}
    }

    const content = fs.readFileSync(this.filename)
    const data = JSON.parse(content.toString()) as {[key: string]: unknown}
    for (const [k, v] of Object.entries(data)) {
      const value = mapper(v)
      this.body.set(k, value)
    }
  }

  async save(mapper: (v: T) => any) {
    if (!this.body) {
      return
    }

    const data: {[key: string]: any} = {}
    for (const [k, v] of this.body.entries()) {
      data[k] = mapper(v)
    }
    fs.writeFileSync(this.filename, JSON.stringify(data))
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
