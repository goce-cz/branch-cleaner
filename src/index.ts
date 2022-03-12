#!/usr/bin/env node

import { Octokit } from '@octokit/rest'
import yargs from 'yargs'
import prompts from 'prompts'

import { GithubRepo } from './github-repo'
import { listAllBranches } from './list-all-branches'
import { exportToIssue } from './export-to-issue'
import { config } from './config'
import { importFromIssue } from './import-from-issue'
import { deleteBranch } from './delete-branch'

const { hideBin } = require('yargs/helpers')

const args = yargs(hideBin(process.argv))
  .options({
    owner: {
      alias: 'o',
      type: 'string',
      required: true,
      default: config.owner
    },
    repo: {
      alias: 'r',
      type: 'string',
      required: true,
      default: config.repo
    },
    token: {
      alias: 't',
      type: 'string',
      required: true,
      default: config.token
    },
    'export-to-issue': {
      alias: 'e',
      type: 'string'
    },
    'issue-label': {
      alias: 'l',
      type: 'array'
    },
    invert: {
      type: 'boolean'
    },
    'import-from-issue': {
      alias: 'i',
      type: 'number'
    }
  }).parseSync()

async function run () {
  const {
    repo,
    owner,
    token,
    'export-to-issue': exportedIssueTitle,
    'issue-label': exportedIssueLabels,
    invert,
    'import-from-issue': importFromIssueNumber
  } = args

  const octokit = new Octokit({
    auth: token
  })

  const githubRepo: GithubRepo = { repo, owner }

  const deletableBranches = (await listAllBranches(octokit, githubRepo))
    .filter(branch => !branch.protected)

  const deletableBranchNames = deletableBranches.map(branch => branch.name)
  let markedForDeletion: Set<string>

  if (importFromIssueNumber) {
    const branches = await importFromIssue(octokit, githubRepo, importFromIssueNumber)
    markedForDeletion = new Set(
      branches
        .filter(branch => invert
          ? !branch.checked
          : branch.checked
        )
        .map(branch => branch.name)
    )
  } else {
    markedForDeletion = new Set(
      deletableBranches
        .filter(branch => !branch.openPullRequest)
        .map(branch => branch.name)
    )
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'userSelectedBranches',
    message: `Select the branches to be ${invert ? 'PRESERVED' : 'DELETED'}`,
    choices: deletableBranchNames.map(branchName => ({
      title: branchName,
      value: branchName,
      selected: invert ? !markedForDeletion.has(branchName) : markedForDeletion.has(branchName)
    }))
  })

  if (!response.userSelectedBranches) {
    console.log('Aborted by the user')
    return
  }

  const finallyCheckedBranchNames = new Set(response.userSelectedBranches as string[])

  if (exportedIssueTitle) {
    const issueNumber = await exportToIssue(
      octokit,
      githubRepo,
      deletableBranchNames,
      finallyCheckedBranchNames,
      {
        title: exportedIssueTitle,
        labels: exportedIssueLabels?.map(String)
      })
    console.log(`Branch list exported to:\nhttps://github.com/${owner}/${repo}/issues/${issueNumber}`)
    return
  }

  const branchesToDelete = deletableBranchNames.filter(branchName => invert
    ? !finallyCheckedBranchNames.has(branchName)
    : finallyCheckedBranchNames.has(branchName)
  )

  if (branchesToDelete.length === 0) {
    console.log('No branches marked for deletion.')
    return
  }

  const { deleteConfirmed } = await prompts({
    type: 'confirm',
    name: 'deleteConfirmed',
    message: `Do you really want to delete ${branchesToDelete.length} branches?`
  })

  if (!deleteConfirmed) {
    console.log('Aborted by the user')
    return
  }

  for (const branch of branchesToDelete) {
    console.log(`Deleting ${branch}`)
    await deleteBranch(octokit, githubRepo, branch)
  }
}

run().catch(console.error)
