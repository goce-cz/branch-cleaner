import { Octokit } from '@octokit/rest'

import { GithubRepo } from './github-repo'

export async function deleteBranch (octokit: Octokit, { repo, owner }: GithubRepo, branch: string) {
  await octokit.rest.git.deleteRef({
    repo,
    owner,
    ref: `heads/${branch}`
  })
}
