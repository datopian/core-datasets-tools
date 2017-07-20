const path = require("path");
const test = require('ava')

const {CoreTools} = require('../index.js')

const statusCsv = path.join(__dirname, 'status-test.csv')

test('it loads', async t => {
  const tool = await CoreTools.load(statusCsv)
  t.is(tool.statuses.length, 1)
  const expected = {
    github_url: "https://github.com/datasets/finance-vix",
    local: "data/finance-vix",
    message: "",
    name: "finance-vix",
    published: "",
    run_date: "",
    validated: ""
	}
  t.deepEqual(tool.statuses[0], expected)
})

test('it checks', async t => {
  const tool = await CoreTools.load(statusCsv, 'test/fixtures')
  await tool.check()
  t.is(tool.statuses[0].validated, true)
})

