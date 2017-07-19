require("babel-core/register")

const fs = require('fs')
const CSV = require('csv-string')

const { DataHub } = require('datahub-cli/lib/utils/datahub.js')
const { Package } = require('datahub-cli/lib/utils/data.js')
const config = require('datahub-cli/lib/utils/config')

const push = () => {
  fs.readFile('status.csv', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    arrayFromContent = CSV.parse(data)
    const headers = arrayFromContent.shift()
    pushCorePackages(arrayFromContent)
  });
}

push()

const pushCorePackages = async (pkgInfo) => {
  //instantiate DataHub class
  const datahub = new DataHub({
    apiUrl: config.get('api'),
    token: config.get('token'),
    owner: config.get('profile').id
  })
  //loop through pkgInfo
  pkgInfo.forEach(async pkgInfo => {
    if(pkgInfo[3]=='OK') {
      //instantiate Package class with valid packages
      const pkg = await Package.load(`data/${pkgInfo[0]}`)
      //push to DataHub
      await datahub.push(pkg)
      const message = '🙌  your data is published!\n'
      const url = '🔗  ' + urljoin(config.get('domain'), config.get('profile').id, pkg.descriptor.name)
      console.log(message + url)
    }
  })
}