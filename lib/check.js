const fs = require('fs')
const CSV = require('csv-string')
const path = require('path')
const diff = require('deep-diff').diff;
const Datapackage = require('datapackage').Datapackage

const { normalizeAll} = require('datahub-cli/lib/normalize.js')

const check = () => {
  let arrayFromContent
  fs.readFile('status.csv', 'utf8', async (err,data) => {
    if (err) {
      return console.log(err);
    }
    arrayFromContent = CSV.parse(data)
    const headers = arrayFromContent.shift()
    const promises = []
    arrayFromContent.forEach(el => {
      const path_ = path.join(`data/${el[0]}`,'datapackage.json')
      promises.push(validateDP(path_, el))
    })
    await Promise.all(promises)
    arrayFromContent.unshift(headers)
    const csv = CSV.stringify(arrayFromContent)
    fs.writeFile('status.csv', csv, function (err) {
      if (err) return console.log(err);
    });
  });
}

const validateDP = async (path_, report) => {
  const date = new Date()
  try {
    let dpObj = await new Datapackage(path_)
    if(dpObj.valid){
      report[3]= 'OK'
      report[2] = date.toISOString()
    }
    
  } catch(error){
      console.log(error)
      let dpOld = readDatapackage(path_)
      let dpNew = readDatapackage(path_)
      dpNew = normalizeAll(dpNew)
      let differences = diff(dpOld, dpNew)
      
      if(differences) {
        console.log("Please, run `data normalize` by hand")
      }
      report[3] = 'Invalid'
      report[4]=error[0]
      report[2] = date.toISOString()
  }
  return report
}

const readDatapackage = (path_) => {
  try {
    return JSON.parse(fs.readFileSync(path_, 'utf8'))
  }
  catch(err) {
    console.log(err)
    logger('datapackage.json not found', 'error', true)
  }
}

module.exports.check = check

