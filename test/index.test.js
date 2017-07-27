const path = require('path')
const test = require('ava')
const sinon = require('sinon')
const {DataHub} = require('datahub-cli/dist/utils/datahub.js')
const {Package} = require('datahub-cli/dist/utils/data.js')

const {CoreTools} = require('../index.js')

const statusCsv = path.join(__dirname, 'status-test.csv')

test.serial('it loads', async t => {
  const tool = await CoreTools.load(statusCsv)
  t.is(tool.statuses.length, 2)
  t.is(tool.statuses[0].local, 'data/finance-vix')
})

test.serial('it checks', async t => {
  const tool = await CoreTools.load(statusCsv, 'test/fixtures')
  const path_ = 'test/status-test.csv'
  await tool.check(path_)
  t.true(tool.statuses[0].validated)
  t.false(tool.statuses[1].validated)
  t.true(tool.statuses[1].message.includes('Invalid type: object (expected array)'))
})

test('it publishes', async t => {
  const datahub = new DataHub({
    apiUrl: 'https://api-test.com',
    token: 'token',
    owner: 'test'
  })
  datahub.push = sinon.spy()
  const tool = await CoreTools.load(statusCsv, 'test/fixtures')
  const path_ = 'test/status-test.csv'
  await tool.push(datahub, path_)
  t.true(tool.statuses[0].published)
  t.false(tool.statuses[1].published)
  t.true(datahub.push.calledOnce)
  t.true(datahub.push.firstCall.args[0] instanceof Package)
})

