import {fetchCurrentAndPreviousContent} from '../src/github'
import {expect, test} from '@jest/globals'

const token = process.env.GITHUB_TOKEN || ''
test('fetchCurrentAndPreviousContent', async () => {
  const [curr, prev] = await fetchCurrentAndPreviousContent('foo', 'bar', 'yarn.lock', '3ed0e27', 1, token)
  expect(curr).toBeTruthy()
  expect(prev).toBeTruthy()
})
