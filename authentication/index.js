const jwt = require('jsonwebtoken')
const APP_SECRET = 'thisisdebats'

const getUserId = context => {
  const authorization = context.request.get('Authorization')
  if (authorization) {
    const token = authorization.replace('Bearer ', '')
    return jwt.verify(token, APP_SECRET).userId
  }
  throw new Error('Not Authenticated')
}

module.exports = { APP_SECRET, getUserId }
