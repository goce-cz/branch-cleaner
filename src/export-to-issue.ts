import { Octokit } from '@octokit/rest'
import { GithubRepo } from './github-repo'

interface IssueOptions {
  labels?: string[]
  title: string
}

export async function exportToIssue (
  octokit: Octokit,
  { repo, owner }: GithubRepo,
  branches: string[],
  checkedBranches: Set<string>,
  { labels, title }: IssueOptions): Promise<number> {
  const { data } = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    labels,
    body: branches
      .map(branch => {
        return `- [${checkedBranches.has(branch) ? 'x' : ' '}] \`${branch}\``
      })
      .join('\n')
  })
  return data.number
}
