require('events').EventEmitter.defaultMaxListeners = 15

const fs = require('fs')
const path = require('path')

const json2csv = require('json2csv')
const lodash = require('lodash')
const toArray = require('stream-to-array')
const simpleGit = require('simple-git')

const {DataHub} = require('datahub-cli/dist/utils/datahub.js')
const config = require('datahub-cli/dist/utils/config')
const {Package, Resource} = require('datahub-cli/dist/utils/data.js')
const {validateData, validateMetadata} = require('datahub-cli/dist/validate.js')
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

  static async load(statusCsvPath, pathToPackagesDirectory = 'data') {
    const res = Resource.load(statusCsvPath)
    let rows = await res.rows()
    rows = await toArray(rows)
    return new CoreTools(rows, pathToPackagesDirectory)
  }

  async check(path_) {
    const date = new Date()
    for (const statusObj of this.statuses) {
      // eslint-disable-next-line camelcase
      statusObj.run_date = date.toISOString()
      const path_ = path.join(statusObj.local, `datapackage.json`)
      // Read given path
      let content
      try {
        content = fs.readFileSync(path_)
      } catch (err) {
        error(err.message)
      }
      //  Get JS object from file content
      const descriptor = JSON.parse(content)
      console.log(`checking following package: ${statusObj.name}`)
      try {
        // Validate Metadata
        const resultMetadata = await validateMetadata(descriptor)
        if (resultMetadata === true) {
          // eslint-disable-next-line camelcase
          statusObj.validated_metadata = true
          try {
            // Validate Data only if metadata is valid
            for (let i = 0; i < descriptor.resources.length; i++) {
              const resource = Resource.load(descriptor.resources[i], path.dirname(path_))
              const resourcePath = path.join(path.dirname(path_), resource.path)
              if (resource.descriptor.format === 'csv') {
                const result = await validateData(resource.descriptor.schema, resourcePath)
                if (result === true) {
                  // eslint-disable-next-line camelcase
                  statusObj.validated_data = true
                  console.log(`valid`)
                } else {
                  error(result)
                  // eslint-disable-next-line camelcase
                  statusObj.validated_data = false
                  // eslint-disable-next-line camelcase
                  statusObj.validated_data_message = result.toString()
                }
              } else {
                // eslint-disable-next-line camelcase
                statusObj.validated_data = true
              }
            }
          } catch (err) {
            error(err[0].message)
            // eslint-disable-next-line camelcase
            statusObj.validated_data = false
            // eslint-disable-next-line camelcase
            statusObj.validated_data_message = err[0].message
          }
        } else {
          error(resultMetadata)
          // eslint-disable-next-line camelcase
          statusObj.validated_data = 'N/A'
          // eslint-disable-next-line camelcase
          statusObj.validated_metadata = false
          // eslint-disable-next-line camelcase
          statusObj.validated_metadata_message = resultMetadata.toString()
        }
      } catch (err) {
        error(err[0].message)
        // eslint-disable-next-line camelcase
        statusObj.validated_data = 'N/A'
        // eslint-disable-next-line camelcase
        statusObj.validated_metadata = false
        // eslint-disable-next-line camelcase
        statusObj.validated_metadata_message = err[0].message
      }
    }
    this.save(path_)
  }

  async clone() {
    for (const statusObj of this.statuses) {
      if (fs.existsSync(path.join(statusObj.local, 'datapackage.json'))) {
        console.log(`pulling latest changes from ${statusObj.github_url}`)
        await simpleGit(statusObj.local).pull(statusObj.github_url, 'master')
      } else {
        console.log(`cloning from ${statusObj.github_url}`)
        await simpleGit().clone(statusObj.github_url, statusObj.local)
      }
    }
  }

  async push(datahub, path_) {
    const date = new Date()
    for (const statusObj of this.statuses) {
      // eslint-disable-next-line camelcase
      statusObj.run_date = date.toISOString()
      //  Push to DataHub
      if (statusObj.validated_metadata === 'true' && statusObj.validated_data === 'true') {
        console.log(`Pushing ${statusObj.name}`)
        //  Instantiate Package class with valid packages
        const pkg = await Package.load(statusObj.local)
        await datahub.push(pkg)
        console.log(`🙌 pushed ${statusObj.name}`)
        statusObj.published = path.join('https://testing.datahub.io', 'core', statusObj.name)
      } else {
        console.log(`${statusObj.name} is not pushed`)
        statusObj.published = '-'
      }
    }
    this.save(path_)
  }

  //  TODO: save pkg statuses to csv at path
  save(path_ = 'status.csv') {
    const fields = ['name', 'github_url', 'run_date', 'validated_metadata', 'validated_data', 'published', 'ok_on_datahub', 'validated_metadata_message', 'validated_data_message']
    const csv = json2csv({
      data: this.statuses,
      fields
    })
    fs.writeFile(path_, csv, err => {
      if (err) {
        console.log(err)
      }
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
    //  Instantiate DataHub class
    const datahub = new DataHub({
      apiUrl: config.get('api'),
      token: config.get('token'),
      authz: config.get('authz'),
      owner: config.get('profile').id
    })
    await tools.push(datahub)
    console.log('🙌 finished pushing!')
  }
})()

module.exports.CoreTools = CoreTools
