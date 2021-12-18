import {fetchContent, Repository} from '../src/github'
import {expect, test} from '@jest/globals'

const token = process.env.GITHUB_TOKEN || ''
test('fetchContent', async () => {
  const content = await fetchContent(
    'kzkn',
    'npm-changelog-url-action',
    'action.yml',
    '95b4ed3dd858',
    token
  )
  expect(content).toBeTruthy()
  expect(content).toContain("'Your name here'")
})

test('Repository#rootFileEntries', async () => {
  const repo = Repository.fromUrl(
    'https://github.com/kzkn/npm-changelog-url-action/',
    token
  )
  const entries = await repo.rootFileEntries()
  expect(entries.length).toBeGreaterThan(0)
  expect(entries.find(e => e.path === 'README.md')).toBeTruthy()
})
