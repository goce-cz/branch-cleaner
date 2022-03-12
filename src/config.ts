import 'dotenv/config'
import { existsSync, readFileSync } from 'fs'
import gitUrlParse from 'git-url-parse'

const packageJson: { repository?: { url: string } } = existsSync('package.json')
  ? JSON.parse(readFileSync('package.json', 'utf8'))
  : undefined

const repoUrl = packageJson?.repository?.url || process.env.GITHUB_REPO_URL
const parsedRepoUrl = repoUrl ? gitUrlParse(repoUrl) : undefined

export const config = {
  repo: process.env.GITHUB_REPO ?? parsedRepoUrl?.name,
  owner: process.env.GITHUB_OWNER ?? parsedRepoUrl?.owner,
  token: process.env.GITHUB_TOKEN
}
