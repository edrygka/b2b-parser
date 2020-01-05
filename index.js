'use strict'

const cron = require('node-cron')
require('dotenv').config()

const Parser = require('./src/parser')
const ParserB2B = new Parser()


async function main() {
  console.log('Main> Initiated first parse process')
  const done = await proceedAgents()

  cron.schedule('0 4 * * *', async () => {
    console.log('Main> Started cron job ')
    // Check if parser already works
    if (done === true) {
      await proceedAgents()
    }
  })

  process.on("unhandledRejection", async (reason, p) => {
    console.error("Unhandled Rejection at: Promise", p, "reason:", reason)
  })
}

async function proceedAgents() {
  await ParserB2B.start()
  await ParserB2B.auth()
  await ParserB2B.parse()
  return true
}

main()

