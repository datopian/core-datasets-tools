const path = require("path")
const test = require('ava')

const {CoreTools} = require('../index.js')

const statusCsv = path.join(__dirname, 'status-test.csv')

test('it loads', async t => {
  const tool = await CoreTools.load(statusCsv)
  t.is(tool.statuses.length, 2)
  t.is(tool.statuses[0].local, "data/finance-vix")
})

test('it checks', async t => {
  const tool = await CoreTools.load(statusCsv, 'test/fixtures')
  const path_ = 'test/status-test.csv'
  await tool.check(path_)
  t.true(tool.statuses[0].validated)
  t.false(tool.statuses[1].validated)
  t.true(tool.statuses[1].message.includes('Invalid type: object (expected array)'))
})


