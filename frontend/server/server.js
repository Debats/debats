const path = require('path')
const fs = require('fs')
const express = require('express')
const http = require('http')
const { version } = require('../package.json')

const DEFAULT_PORT = 80
const PUBLIC_PATH = `./dist/prod`
const HTML_FILE = path.resolve(__dirname, '..', 'dist', 'prod', 'index.html')

const makeApp = API_URI => {
  const htmlFile = fs.readFileSync(HTML_FILE, 'utf8')
  const scriptTag = `<script>var API_URI = "${API_URI}"</script>`
  const htmlFileWithAPI = (API_URI)
    ? htmlFile.replace('</head>', `${scriptTag}</head>`)
    : htmlFile

  fs.unlinkSync(HTML_FILE)

  const app = express()

  app.use(express.static(PUBLIC_PATH))

  app.get('/life', (req, res) => {
    res.status(200).send(`Débats is alive. Version ${version}`)
  })

  app.use((req, res) => {
    res.status(200).send(htmlFileWithAPI)
  })

  return port => {
    const restoreIndex = () => { fs.writeFileSync(HTML_FILE, htmlFile) }

    const server = http.createServer(app)

    const onStop = () => {
      restoreIndex()
      server.close()
    }

    server.on('error', (e) => {
      console.log('Could not start server: ', e)
      restoreIndex()
    })

    process.on('SIGTERM', onStop)
    process.on('SIGINT', onStop)

    const listeningPort = port || DEFAULT_PORT

    server.listen(listeningPort, () => {
      console.log(`🛰   Débats.co, up and running !`)
      console.log(`http://0.0.0.0:${listeningPort}`)
      console.log(`Version: ${version}`)
      console.log(`API URI: ${API_URI}`)
    })
  }
}

module.exports = makeApp
