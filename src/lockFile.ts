import * as yarnLockfile from '@yarnpkg/lockfile'
import yaml from 'js-yaml'
import {Lockfile} from '@pnpm/lockfile-types'

type InstalledPackage = {
  name: string
  version: string
}

export type InstalledPackages = Map<string, InstalledPackage>

export function parseLockFile(text: string, path: string): InstalledPackages {
  if (path.endsWith('yarn.lock')) {
    return parseYarnLockFile(text)
  } else if (path.endsWith('pnpm-lock.yaml')) {
    return parsePnpmLockFile(text)
  } else {
    throw new Error(`Invalid lock file path: ${path}`)
  }
}

export function parseYarnLockFile(text: string): InstalledPackages {
  const {object: content} = yarnLockfile.parse(text)
  const pkgs = new Map<string, InstalledPackage>()
  for (const key of Object.keys(content)) {
    const parts = key.split('@')
    const name = parts[0] === '' ? `@${parts[1]}` : parts[0]
    pkgs.set(name, {
      name,
      version: content[key].version as string
    })
  }
  return pkgs
}

export function parsePnpmLockFile(text: string): InstalledPackages {
  const lockfileFile = yaml.load(text) as Lockfile
  const pkgs = new Map<string, InstalledPackage>()
  if (!lockfileFile.packages) return pkgs

  for (const key of Object.keys(lockfileFile.packages)) {
    const parts = key.split('_')[0].split('/')
    const name = parts.slice(1, -1).join('/')
    const version = parts.slice(-1)[0]

    pkgs.set(name, {
      name,
      version
    })
  }
  return pkgs
}
