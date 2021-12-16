import lockfile from '@yarnpkg/lockfile'

type InstalledPackage = {
  name: string
  version: string
}

export class YarnLockFile {
  static parse(text: string): YarnLockFile {
    const json = lockfile.parse(text)
    return new YarnLockFile(json.object)
  }

  private content: any

  constructor(content: any) {
    this.content = content
  }

  installedPackages(): Map<string, InstalledPackage> {
    const pkgs = new Map<string, InstalledPackage>()
    for (const key of Object.keys(this.content)) {
      pkgs.set(key, {
        name: this.nameOf(key),
        version: this.content[key].version as string
      })
    }
    return pkgs
  }

  nameOf(key: string): string {
    const names = key.split('@')
    let name = names[0]
    if (name == '') {
      name = '@' + names[1]
    }
    return name
  }
}
