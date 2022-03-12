import { Octokit } from '@octokit/rest'
import { GithubRepo } from './github-repo'

export interface ImportedBranch {
  name: string
  checked: boolean
}

function parseBody(body: string): ImportedBranch[] {
  const entries = body.matchAll(/- \[([x ])] `([^`]+)`/gi)
  return Array.from(entries).map(([,checked, name]) => ({
    checked: !!checked.trim(),
    name
  }))
}

export async function importFromIssue (
  octokit: Octokit,
  { repo, owner }: GithubRepo,
  issueNumber: number
): Promise<ImportedBranch[]> {
  const { data } = await octokit.rest.issues.get({
    issue_number: issueNumber,
    owner,
    repo
  })
  if (!data.body) {
    throw new Error('issue doesn\'t have any body')
  }
  return parseBody(data.body)
}
