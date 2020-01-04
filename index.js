'use strict'

const cron = require('node-cron')
require('dotenv').config()

const Parser = require('./src/parser')
const ParserB2B = new Parser()


async function main() {
  console.log('Initiated first parse process')
  await proceedAgents()

  cron.schedule('0 8 * * *', async () => {
    console.log('Started cron job ')
    await proceedAgents()
  })

  process.on("unhandledRejection", async (reason, p) => {
    console.error("Unhandled Rejection at: Promise", p, "reason:", reason)
  })
}

async function proceedAgents() {
  await ParserB2B.start()
  await ParserB2B.auth()
  await ParserB2B.parse()
}

main()

