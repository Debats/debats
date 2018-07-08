const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { APP_SECRET, getUserId } = require('../authentication')

const newSubject = (root, args, context, info) => context.db.mutation.createSubject({
  data: {
    title: args.title,
    description: args.description,
    slug: args.title,
    createdBy: { connect: { id: getUserId(context) } }
  }
}, info)

const signup = async (parent, args, context) => {
  const password = await bcrypt.hash(args.password, 10)
  const user = await context.db.mutation.createUser({
    data: { ...args, password }
  }, `{ id }`)
  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return { token, user }
}

const login = async (parent, args, context) => {
  const user = await context.db.query.user({ where: { email: args.email } }, `{ id password }`)
  if (!user) throw new Error('no such user found')

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) throw new Error('invalid password')

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return { token, user }
}

module.exports = {
  signup,
  login,
  newSubject
}
