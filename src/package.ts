import npmRegistryFetch from 'npm-registry-fetch'
import {newGithub} from './github'

export async function resolvePackage(
  name: string,
  npmToken: string
): Promise<Package | undefined> {
  try {
    const npmInfo = await npmRegistryFetch.json(name, {token: npmToken})
    return new Package(name, npmInfo)
  } catch (e) {
    console.debug(`failed to fetch npm package info: ${name}`, e)
  }
}

class Package {
  name: string
  private info: any

  constructor(name: string, info: any) {
    this.name = name
    this.info = info
  }

  github(githubToken: string): ReturnType<typeof newGithub> {
    const {repository} = this.info
    if (repository && repository.url) {
      console.log(`npm package: ${this.name} ${repository.url}`)
      return newGithub(repository.url as string, githubToken)
    }
  }
}
