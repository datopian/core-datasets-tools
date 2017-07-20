require("babel-core/register")

const fs = require('fs')
const path = require('path')

// const diff = require('deep-diff').diff;
const lodash = require('lodash')
const Datapackage = require('datapackage').Datapackage
const toArray = require('stream-to-array')
const simpleGit = require('simple-git')

const { DataHub } = require('../lib/utils/datahub.js')
const config = require('../lib/utils/config')
const {normalizeAll} = require('../lib/normalize.js')
const {Package, Resource} = require('../lib/utils/data.js')


class CoreTools {
  constructor(rows, pathToPackagesDirectory) {
    // TODO: Resource.rows should do this for us ...
    this.headers = rows.shift()
    this.statuses = rows.map(row => {
      return lodash.zipObject(this.headers, row)
    })
    this.statuses.forEach(row => {
      row.local = path.join(pathToPackagesDirectory, row.name)
    })
  }

  static async load(statusCsvPath, pathToPackagesDirectory='data') {
    const res = Resource.load(statusCsvPath)
    let rows = await res.rows
    rows = await toArray(rows)
    return new CoreTools(rows, pathToPackagesDirectory)
  }

  async check() {
		const date = new Date()
    for(let statusObj of this.statuses) {
      statusObj.run_date = date.toISOString()
      try {
        let dpObj = await new Datapackage(statusObj.local + '/datapackage.json')
        // TODO: we assume that DP is alwasy valid if we could instantiate without error
        statusObj.validated = true
      } catch(error) {
        statusObj.validated = false
        statusObj.message = error[0]
				console.log(error)
      }
    }
  }

	async validateDP(statusObj) {
    let dpOld = Package.load(path_).descriptor
    let dpNew = readDatapackage(path_)
    dpNew = normalizeAll(dpNew)
    // let differences = diff(dpOld, dpNew)

    if(differences) {
      console.log("Please, run `data normalize` by hand")
    }
    report[3] = 'Invalid'
    report[2] = date.toISOString()
	}

  async clone() {
    for(let statusObj of this.statuses) {
      if (fs.existsSync(path.join(statusObj.local, 'datapackage.json'))) {
        console.log(`pulling latest changes from ${statusObj.github_url}`)
        await simpleGit(statusObj.local).pull(statusObj.github_url, 'master')
      } else {
        console.log(`cloning from ${statusObj.github_url}`)
        await simpleGit().clone(statusObj.github_url, statusObj.local)
      }
    }
  }

  async push() {
    //instantiate DataHub class
    const datahub = new DataHub({
      apiUrl: config.get('api'),
      token: config.get('token'),
      authz: config.get('authz'),
      owner: config.get('profile').id
    })
    for(let statusObj of this.statuses) {
      //instantiate Package class with valid packages
      const pkg = await Package.load(statusObj.local)
      //push to DataHub
      await datahub.push(pkg)
      console.log(`🙌 pushed ${statusObj.name}`)
    }
  }

  // TODO: save pkg statuses to csv at path
  save(path) {
    const csv = CSV.stringify(arrayFromContent)
    fs.writeFile('status.csv', csv, function (err) {
      if (err) return console.log(err);
    })
  }
}

(async () => {
  const tools = await CoreTools.load('core-datasets-tools/status.csv', 'core-datasets-tools/data')
  if (process.argv[2] === 'check') {
    await tools.check()
  } else if (process.argv[2] === 'clone') {
    await tools.clone()
    console.log('🙌 finished pulling & cloning!')
  } else if (process.argv[2] === 'push') {
    await tools.push()
    console.log('🙌 finished pushing!')
  }
})()

module.exports.CoreTools = CoreTools
