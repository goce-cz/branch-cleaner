import { Octokit } from '@octokit/rest'
import { fetchAllPages } from './fetch-all-pages'
import { GithubRepo } from './github-repo'
import { components } from '@octokit/openapi-types'

export type GitHubPullRequest = components['schemas']['pull-request-simple']
export type GitHubBranch = components['schemas']['short-branch'] & {
  openPullRequest?: GitHubPullRequest
}

export async function listAllBranches (octokit: Octokit, { owner, repo }: GithubRepo): Promise<GitHubBranch[]> {
  const branches = await fetchAllPages(octokit.rest.repos.listBranches, {
    repo,
    owner
  })

  const pulls = await fetchAllPages(octokit.rest.pulls.list, {
    repo,
    owner,
    state: 'open'
  } as const)

  pulls.map(pull => pull.head)
  const openPrByHead = new Map(pulls.map(pull => [pull.head.ref, pull]))

  return branches
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(branch => ({ ...branch, openPullRequest: openPrByHead.get(branch.name) }))
}
