const { api, port } = require('yargs').argv
const makeApp = require('./server.js')

makeApp(api)(port)
