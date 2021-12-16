import npmRegistryFetch from 'npm-registry-fetch'
import {newGithub} from './github'

export async function resolvePackage(
  name: string,
  npmToken: string
): Promise<Package | undefined> {
  try {
    const npmInfo = await npmRegistryFetch.json(name, {token: npmToken})
    return new Package(npmInfo)
  } catch (e) {
    console.debug(`failed to fetch npm package info: ${name}`, e)
  }
}

class Package {
  private info: any

  constructor(info: any) {
    this.info = info
  }

  github(githubToken: string): ReturnType<typeof newGithub> {
    const {repository} = this.info
    if (repository && repository.url) {
      return newGithub(repository.url as string, githubToken)
    }
  }
}
