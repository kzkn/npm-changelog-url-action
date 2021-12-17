import {fetchContent} from '../src/github'
import {expect, test} from '@jest/globals'

const token = process.env.GITHUB_TOKEN || ''
test('fetchContent', async () => {
  const content = await fetchContent('foo', 'bar', 'yarn.lock', '3ed0e27', token)
  expect(content).toBeTruthy()
})
