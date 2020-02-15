'use strict'

const cron = require('node-cron')
require('dotenv').config()
const logger = require('./src/logger')('Main')

const Parser = require('./src/parser')
const ParserB2B = new Parser()


async function main() {
  logger.info('Initiated first parse process')
  let busy = true // Flag to signal when we can parse
  await proceedAgents()
  busy = false
  logger.info('Finished initial parse process')

  // Start parsing every day at 2am 
  cron.schedule('0 0 * * *', async () => {
    logger.info('Started cron job ')
    // Check if parser already works
    if (busy === false) {
      busy = true
      await proceedAgents()
      busy = false
    }
  })

  // Start parsing every day in 2pm 
  cron.schedule('0 12 * * *', async () => {
    logger.info('Started cron job ')
    // Check if parser already works
    if (busy === false) {
      busy = true
      await proceedAgents()
      busy = true
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
}

main()
