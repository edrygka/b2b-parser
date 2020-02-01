'use strict'

const Promise = require("bluebird")

// Move page to next pagination page
exports.clickToPage = async (page, num) =>
  await page.evaluate((num) => document.querySelectorAll('.paginationjs-page.J-paginationjs-page')[num].click(), num)

// Returns max pagination page number
exports.getMaxPageNum = async (page) => await page.$$eval('.paginationjs-page.J-paginationjs-page', element => element[5].innerText)

// Returns current page number
exports.getCurrentPage = async (page) =>
  await page.$eval('.paginationjs-page.J-paginationjs-page.active', page => page.children[0].innerText)

// Collects all agent ids from current page
exports.getAgentsId = async (page) => {
  const result = await page.evaluate(() => {
    const agentIds = []
    document.querySelectorAll('.col-xl-4.col-md-6').forEach(value => {
      const func = value.children[0].children[0].children[6].children[0].getAttribute('onclick')
      const agentId = func.substring(func.indexOf('(') + 1, func.indexOf(')'))
      agentIds.push(agentId)
    })
    return agentIds
  })
  return result
}

// opens agent info modal window
exports.openAgentInfoWindow = async (page, id) => {
  await Promise.delay(1000)
  await page.evaluate((id) => agentInfoDetails(id), id)
}

// quit agent info modal window
exports.quitAgentInfoWindow = async (page) => {
  await Promise.delay(2000)
  await page.$eval('.ik.ik-x.ik-3x', (quit) => quit.click())
}

// Returns agentInfo taking from modal window
exports.getAgentInfo = async (page, id) => {
  await Promise.delay(5000) // Set delay cause this function could be triggered earlier than element will appear in DOM
  const info = await page.evaluate((id) => {
    const cat1 = document.querySelectorAll('p.text-muted.mb-0')
    const cat2 = document.querySelectorAll('.text-muted.float-right.f-14')
    return {
      agentId: id,
      name: cat1[1].innerHTML,
      phone: cat1[2].innerHTML,
      city: cat1[3].innerHTML,
      rang: cat2[0].innerHTML.substring(0, cat2[0].innerHTML.indexOf('<')) + cat2[0].children[0].innerHTML,
      oborot: cat2[1].innerHTML.substring(0, cat2[1].innerHTML.lastIndexOf(',')).replace(',', ''),
      ownInvests: cat2[2].innerHTML.substring(0, cat2[2].innerHTML.lastIndexOf(',')).replace(',', ''),
      lastDateBuy: cat2[3].innerHTML,
      clientInvests: (Number(cat2[4].innerHTML) !== 0) ? cat2[4].innerHTML.replace(',', '') : cat2[4].innerHTML,
      agents1Level: cat2[5].innerHTML,
      agentsInNetwork: cat2[6].innerHTML,
      oborotInMonth: cat2[7].innerHTML.substring(0, cat2[7].innerHTML.lastIndexOf(',')).replace(',', ''),
    }
  }, id)
  return info
}
