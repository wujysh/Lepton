'use strict'

import { Promise } from 'bluebird'
import Request from 'request'
import ReqPromise from 'request-promise'
import Notifier from '../notifier'

import { remote } from 'electron'
const logger = remote.getGlobal('logger')

// TODO: move to global configuration
let Network = null
try {
  Network = require('../../../configs/network')
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e
  Network = require('../../../configs/networkDummy')
}

import ProxyAgent from 'proxy-agent'
let proxyAgent = null
const proxyUri = process.env.http_proxy || Network.proxy
if (proxyUri) {
  logger.info("use proxy", proxyUri)
  proxyAgent = new ProxyAgent(proxyUri)
}

function exchangeAccessToken (clientId, clientSecret, authCode) {
  return ReqPromise({
    method: 'POST',
    uri: 'https://github.com/login/oauth/access_token',
    agent: proxyAgent,
    form: {
      'client_id': clientId,
      'client_secret': clientSecret,
      'code': authCode,
    },
    json: true
  })
}

function getUserProfile (accessToken) {
  const USER_PROFILE_URI = 'https://api.github.com/user'
  return ReqPromise({
    uri: USER_PROFILE_URI,
    agent: proxyAgent,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    method: 'GET',
    qs: {
      access_token: accessToken
    },
    json: true // Automatically parses the JSON string in the response
  })
}

function getSingleGist (accessToken, gistId) {
  const SINGLE_GIST_URI = 'https://api.github.com/gists/'
  return ReqPromise({
    uri: SINGLE_GIST_URI + gistId,
    agent: proxyAgent,
    headers: {
      'User-Agent': 'Request-Promise'
    },
    method: 'GET',
    qs: {
      access_token: accessToken
    },
    json: true // Automatically parses the JSON string in the response
  })
}

const EMPTY_PAGE_ERROR_MESSAGE = 'page empty (Not an error)'
function getAllgists (accessToken, userLoginId) {
  let gistList = []
  return new Promise(function (resolve, reject) {
    const maxPageNumber = 100
    let funcs = Promise.resolve(
      makeRangeArr(1, maxPageNumber).map(
        (n) => makeRequestForGetAllGists(makeOptionForGetAllGists(accessToken, userLoginId, n))))

    funcs.mapSeries(iterator)
      .catch(err => {
        if (err !== EMPTY_PAGE_ERROR_MESSAGE) {
          logger.error(err)
          Notifier('Sync failed', 'Please check your network condition.')
        }
      })
      .finally(() => {
        resolve(gistList)
      })
  })

  function iterator (f) {
    return f()
  }

  function makeRequestForGetAllGists (option) {
    return function () {
      return new Promise(function (resolve, reject) {
        Request(option, function (error, response, body) {
          logger.debug('The gist number on this page is ' + body.length)
          if (error) {
            reject(error)
          } else if (body.length === 0) {
            reject(EMPTY_PAGE_ERROR_MESSAGE)
          } else {
            for (let key in body) {
              if (body.hasOwnProperty(key)) {
                gistList.push(body[key])
              }
            }
            resolve(body)
          }
        })
      })
    }
  }
}

function makeOptionForGetAllGists (accessToken, userLoginId, pageNumber) {
  return {
    uri: 'https://api.github.com/users/' + userLoginId + '/gists',
    agent: proxyAgent,
    headers: {
      'User-Agent': 'request',
    },
    method: 'GET',
    qs: {
      access_token: accessToken,
      page: pageNumber
    },
    json: true
  }
}

function makeRangeArr (start, end) {
  let result = []
  for (let i = start; i <= end; i++) result.push(i)
  return result
}

function createSingleGist (accessToken, description, files, isPublic) {
  return ReqPromise({
    headers: {
      'User-Agent': 'request',
    },
    method: 'POST',
    uri: 'https://api.github.com/gists',
    agent: proxyAgent,
    qs: {
      access_token: accessToken
    },
    body: {
      description: description,
      public: isPublic,
      files: files
    },
    json: true
  })
}

function editSingleGist (accessToken, gistId, updatedDescription, updatedFiles) {
  return ReqPromise({
    headers: {
      'User-Agent': 'request',
    },
    method: 'PATCH',
    uri: 'https://api.github.com/gists/' + gistId,
    agent: proxyAgent,
    qs: {
      access_token: accessToken
    },
    body: {
      description: updatedDescription,
      files: updatedFiles
    },
    json: true
  })
}

function deleteSingleGist (accessToken, gistId) {
  return ReqPromise({
    headers: {
      'User-Agent': 'request',
    },
    method: 'DELETE',
    uri: 'https://api.github.com/gists/' + gistId,
    agent: proxyAgent,
    qs: {
      access_token: accessToken
    },
    json: true
  })
}

export const EXCHANGE_ACCESS_TOKEN = 'EXCHANGE_ACCESS_TOKEN'
export const GET_ALL_GISTS = 'GET_ALL_GISTS'
export const GET_SINGLE_GIST = 'GET_SINGLE_GIST'
export const GET_USER_PROFILE = 'GET_USER_PROFILE'
export const CREATE_SINGLE_GIST = 'CREATE_SINGLE_GIST'
export const EDIT_SINGLE_GIST = 'EDIT_SINGLE_GIST'
export const DELETE_SINGLE_GIST = 'DELETE_SINGLE_GIST'

export function getGitHubApi (selection) {
  switch (selection) {
    case EXCHANGE_ACCESS_TOKEN:
      return exchangeAccessToken
    case GET_ALL_GISTS:
      return getAllgists
    case GET_SINGLE_GIST:
      return getSingleGist
    case GET_USER_PROFILE:
      return getUserProfile
    case CREATE_SINGLE_GIST:
      return createSingleGist
    case EDIT_SINGLE_GIST:
      return editSingleGist
    case DELETE_SINGLE_GIST:
      return deleteSingleGist
    default:
      logger.debug('Not implemented yet.')
  }
}
