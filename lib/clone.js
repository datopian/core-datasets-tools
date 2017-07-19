const fs = require('fs')
const CSV = require('csv-string')
const simpleGit = require('simple-git')

const clone = () => {
  fs.readFile('status.csv', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    arrayFromContent = CSV.parse(data)
    const headers = arrayFromContent.shift()
    arrayFromContent.forEach(el => {
      if (fs.existsSync(`data/${el[0]}`)) {
        simpleGit(`data/${el[0]}`).pull(el[1], 'master')
      }else{
        simpleGit().clone(el[1], `data/${el[0]}`)
      }
    })
  });
}

module.exports.clone = clone
