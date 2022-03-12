#!/usr/bin/env node

import { Octokit } from '@octokit/rest'
import yargs from 'yargs/yargs'
import prompts from 'prompts'

import { GithubRepo } from './github-repo'
import { listAllBranches } from './list-all-branches'
import { exportToIssue } from './export-to-issue'
import { config } from './config'
import { importFromIssue } from './import-from-issue'

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

  let allBranchNames: string[]
  let initiallyCheckedBranchNames: Set<string>

  if (importFromIssueNumber) {
    const branches = await importFromIssue(octokit, githubRepo, importFromIssueNumber)
    allBranchNames = branches.map(branch => branch.name)
    initiallyCheckedBranchNames = new Set(
      branches
        .filter(branch => branch.checked)
        .map(branch => branch.name)
    )
  } else {
    const branches = (await listAllBranches(octokit, githubRepo))
      .filter(branch => !branch.protected)
    allBranchNames = branches.map(branch => branch.name)
    initiallyCheckedBranchNames = new Set(
      branches
        .filter(branch => invert
          ? !!branch.openPullRequest
          : !branch.openPullRequest
        )
        .map(branch => branch.name)
    )
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'userSelectedBranches',
    message: `Select the branches to be ${invert ? 'PRESERVED' : 'DELETED'}`,
    choices: allBranchNames.map(branchName => ({
      title: branchName,
      value: branchName,
      selected: initiallyCheckedBranchNames.has(branchName)
    }))
  })

  console.log(response)

  const finallyCheckedBranchNames = new Set(response.userSelectedBranches as string[])

  if (exportedIssueTitle) {
    const issueNumber = await exportToIssue(
      octokit,
      githubRepo,
      allBranchNames,
      finallyCheckedBranchNames,
      {
        title: exportedIssueTitle,
        labels: exportedIssueLabels?.map(String)
      })
    console.log(`Branch list exported to:\nhttps://github.com/${owner}/${repo}/issues/${issueNumber}`)
    return
  }

  const branchesToDelete = allBranchNames.filter(branchName => invert
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
    console.log('Deletion aborted by user.')
    return
  }

  console.log(`Deleting...\n\t${branchesToDelete.join('\n\t')}`)
}

run().catch(console.error)
