const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'  // Listen on all interfaces for Azure
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080

// Check if .next directory exists in production
if (!dev) {
  const buildDir = path.join(process.cwd(), '.next')
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Production build not found! Please run "npm run build" first.')
    console.error(`Looking for build directory at: ${buildDir}`)
    console.error('Current working directory:', process.cwd())
    console.error('Directory contents:', fs.readdirSync(process.cwd()))
    process.exit(1)
  }
  console.log('✅ Production build found at:', buildDir)
}

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('✅ Next.js application prepared successfully')
  
  createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true)
      const { pathname, query } = parsedUrl

      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 VoteGuard server ready on http://${hostname}:${port}`)
    console.log(`📊 Environment: ${dev ? 'development' : 'production'}`)
    console.log(`🕐 Started at: ${new Date().toISOString()}`)
  })
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js application:', err)
  process.exit(1)
})