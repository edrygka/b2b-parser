'use strict'

const cron = require('node-cron')
const puppeteer = require('puppeteer')
const { Pool } = require('pg')
const crypto = require('crypto')

require('dotenv').config()

const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS
const DB_NAME = process.env.DB_NAME

const connectionString = `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`

async function main() {
  const pool = new Pool({
    connectionString: connectionString,
  })
  const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] })
  const page = await browser.newPage()

  try {
    console.log('Initiated first parse process')
    await proceedAgents(pool, page)
  } catch (err) {
    console.log(err)
    await pool.end()
  } 

  cron.schedule('0 8 * * *', async () => {
    console.log('Started cron job ')
    try {
      await proceedAgents(pool, page)
    } catch (err) {
      console.log(err)
      await pool.end()
    } 
  })

  process.on("unhandledRejection", async (reason, p) => {
    console.error("Unhandled Rejection at: Promise", p, "reason:", reason)
    await page.close()
    await pool.end()
  })
}

async function proceedAgents(pool, page) {
  const agentsInfo = await parseAgents(page)
  console.log('Parsing completed without errors')

  console.log('Started saving data to database')
  for (let i = 0; i < agentsInfo.length; i++) {
    const existingAgent = (await pool.query('SELECT * FROM agentsinfo WHERE agentid = $1',
      [ agentsInfo[i].agentId ])).rows[0]

    const agentHash = crypto.createHash('md5').update(JSON.stringify(agentsInfo[i])).digest('hex')
    if (existingAgent && agentHash !== existingAgent.hashsum) {
      await pool.query('UPDATE agentsinfo SET (name, phone, city, rang, oborot, ' + 
        'ownInvests, lastDateBuy, clientInvests, agents1Level, agentsInNetwork, ' + 
        'oborotInMonth, hashsum) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ' + 
        '$12) WHERE agentid = $13', 
        [ agentsInfo[i].name, agentsInfo[i].phone, agentsInfo[i].city, agentsInfo[i].rang, 
          agentsInfo[i].oborot, agentsInfo[i].ownInvests, agentsInfo[i].lastDateBuy, 
          agentsInfo[i].clientInvests, agentsInfo[i].agents1Level, agentsInfo[i].agentsInNetwork, 
          agentsInfo[i].oborotInMonth, agentHash, agentsInfo[i].agentId ])
    }

    if (!existingAgent) {
      await pool.query('INSERT INTO agentsinfo(agentid, name, phone, city, rang, ' +
      'oborot, ownInvests, lastDateBuy, clientInvests, agents1Level, agentsInNetwork, ' + 
      'oborotInMonth, hashsum) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', 
      [ agentsInfo[i].agentId, agentsInfo[i].name, agentsInfo[i].phone, agentsInfo[i].city, agentsInfo[i].rang,
        agentsInfo[i].oborot, agentsInfo[i].ownInvests, agentsInfo[i].lastDateBuy, agentsInfo[i].clientInvests,
        agentsInfo[i].agents1Level, agentsInfo[i].agentsInNetwork, agentsInfo[i].oborotInMonth, agentHash ])
    }
  }
  console.log('Saving completed')
}

async function parseAgents(page) {
  let agentsInfo
  try {
    // Go to website
    console.log('Going to https://my.b2b.jewelry/')
    await page.goto('https://my.b2b.jewelry/', { waitUntil: 'networkidle2' })
    await page.waitForNavigation()

    // Input credentials to authorize parser
    console.log('Started authorization step')
    await page.type('#phone', process.env.B2B_LOGIN)
    await page.type('input[name=password]', process.env.B2B_PASS)
    await page.waitFor(1000)
    await page.click('button.btn.btn-theme')
    await page.waitForSelector('div.page-wrap', { timeout: 1000 * 60 * 2 }) // waiting for 2 minutes

    // Go to networks page
    console.log('Going to https://my.b2b.jewelry/network')
    await page.goto('https://my.b2b.jewelry/network', { waitUntil: 'networkidle2' })
    await page.waitForSelector('#network-data')

    agentsInfo = await page.$eval('div#network-data', async (el) => {
      const agentData = []

      // function click to next page in pagination block
      const clickToPage = (num) => new Promise((resolve, reject) => {
        document.querySelectorAll('.paginationjs-page.J-paginationjs-page')[num].click()
        setTimeout(() => resolve(), 2000)
      })

      const maxPageNum = document.querySelectorAll('.paginationjs-page.J-paginationjs-page')[5].innerText
      for (let i = 0; i < maxPageNum; i++) {
        if (i > 5) {
          await clickToPage(4)
        } else if (i === 53) {
          await clickToPage(6)
        } else {
          await clickToPage(i)
        }
        // await collecting data
        const agentIds = []
        document.querySelectorAll('.col-xl-3.col-lg-6.col-md-4').forEach(async value => {
          // collecting agent ids
          const func = value.children[0].children[0].children[6].children[0].getAttribute('onclick')
          const agentId = func.substring(func.indexOf('(') + 1, func.indexOf(')'))
          agentIds.push(agentId)
        })

        // Showing modal window with agent details
        const getAgentInfo = id => new Promise((resolve, reject) => {
          agentInfoDetails(id)
          setTimeout(() => {
            resolve()
          }, 5000)
        })

        // Quit modal window
        const quitModalWindow = () => new Promise((resolve, reject) => {
          document.querySelector('.ik.ik-x.ik-3x').click()
          setTimeout(() => resolve(), 2000)
        })

        // Going through every agent, parsing personal data
        for(let i = 0; i < agentIds.length; i++){
          await getAgentInfo(agentIds[i])
          const cat1 = document.querySelectorAll('p.text-muted.mb-0')
          const cat2 = document.querySelectorAll('.text-muted.float-right.f-14')
          agentData.push({
            agentId: agentIds[i],
            name: cat1[1].innerHTML,
            phone: cat1[2].innerHTML,
            city: cat1[3].innerHTML,
            rang: cat2[0].innerHTML.substring(0, cat2[0].innerHTML.indexOf('<')) + cat2[0].children[0].innerHTML,
            oborot: cat2[1].innerHTML,
            ownInvests: cat2[2].innerHTML,
            lastDateBuy: cat2[3].innerHTML,
            clientInvests: cat2[4].innerHTML,
            agents1Level: cat2[5].innerHTML,
            agentsInNetwork: cat2[6].innerHTML,
            oborotInMonth: cat2[7].innerHTML,
          })
          await quitModalWindow()
        }
        // This break needed only for test reasons to check only first 12 agents
        //break  //__________________________________________________ TODO: REMOVE THIS BREAK STATEMENT _____________________________________________________
      }
      return agentData
    })
  } catch(err) {
    console.log(err)
  } finally {
    page.close()
    return agentsInfo
  }
}

main()

