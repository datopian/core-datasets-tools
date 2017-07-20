const fs = require('fs')
const path = require('path')

// const diff = require('deep-diff').diff;
const lodash = require('lodash')
const Datapackage = require('datapackage').Datapackage
const toArray = require('stream-to-array')

const {normalizeAll} = require('../lib/normalize.js')
const {Package, Resource} = require('../lib/utils/data.js')


export class CoreTools {
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
    // promises.push(validateDP(path_, el))
    // await Promise.all(promises)
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

  // TODO: save pkg statuses to csv at path
  save(path) {
    const csv = CSV.stringify(arrayFromContent)
    fs.writeFile('status.csv', csv, function (err) {
      if (err) return console.log(err);
    });
  }
}

