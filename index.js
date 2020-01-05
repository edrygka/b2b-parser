'use strict'

const cron = require('node-cron')
require('dotenv').config()
const logger = require('./src/logger')('Main')

const Parser = require('./src/parser')
const ParserB2B = new Parser()


async function main() {
  logger.info('Initiated first parse process')
  const done = await proceedAgents()

  // Start parsing every day in 6am 
  cron.schedule('0 4 * * *', async () => {
    logger.info('Started cron job ')
    // Check if parser already works
    if (done === true) {
      await proceedAgents()
    }
  })

  process.on("unhandledRejection", async (reason, p) => {
    logger.error(reason, `Unhandled Rejection at: Promise ${p}`)
  })
}

async function proceedAgents() {
  await ParserB2B.start()
  await ParserB2B.auth()
  await ParserB2B.parse()
  return true
}

main()

