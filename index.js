require("babel-core/register")
require('events').EventEmitter.defaultMaxListeners = 15

const fs = require('fs')
const path = require('path')


const json2csv = require('json2csv');
const lodash = require('lodash')
const toArray = require('stream-to-array')
const simpleGit = require('simple-git')
const CSV = require('csv-string')

const { DataHub } = require('datahub-cli/dist/utils/datahub.js')
const config = require('datahub-cli/dist/utils/config')
const {normalizeAll} = require('datahub-cli/dist/normalize.js')
const {Package, Resource} = require('datahub-cli/dist/utils/data.js')
const {validate} = require('datahub-cli/dist/validate.js')
const {error} = require('datahub-cli/dist/utils/error')


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
    let rows = await res.rows()
    rows = await toArray(rows)
    return new CoreTools(rows, pathToPackagesDirectory)
  }

  async check(path_) {
		const date = new Date()
    for(let statusObj of this.statuses) {
      statusObj.run_date = date.toISOString()
      let path_ = path.join(statusObj.local,`datapackage.json`)
      // Read given path
      let content
      try {
        content = fs.readFileSync(path_)
      } catch (err) {
        error(err.message)
        process.exit(1)
      }
      // Get JS object from file content
      const descriptor = JSON.parse(content)
      //descriptor.profile = 'https://schemas.frictionlessdata.io/data-package.json'
      console.log(`checking following packages: ${statusObj.name}`)
      try {
        const result = await validate(descriptor, path.dirname(path_))
        if (result === true) {
          statusObj.validated = true
          console.log(`valid`)
        } else {
          error(result)
          //const result = CSV.stringify(result)
          statusObj.validated = false
          statusObj.message = result.toString()
        }
      } catch(err) {
        error(err.message)
        statusObj.validated = false
        statusObj.message = err.message
      }
    }
    this.save(path_)
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
  save(path_ = 'status.csv') {
    var fields = ['name', 'github_url', 'run_date', 'validated', 'message', 'published'];
    var csv = json2csv({ data: this.statuses, fields: fields });
    fs.writeFile(path_, csv, function (err) {
      if (err) return console.log(err);
    })
  }
}

(async () => {
  const tools = await CoreTools.load('status.csv')
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
