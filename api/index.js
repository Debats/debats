const { GraphQLServer } = require('graphql-yoga')
const { Prisma } = require('prisma-binding')
const Query = require('./resolvers/query')
const Mutation = require('./resolvers/mutation')
const Subscription = require('./resolvers/subscription')
const AuthPayload = require('./resolvers/authPayload')
const Subject = require('./resolvers/subject')

const resolvers = {
  Query,
  Mutation,
  Subscription,
  AuthPayload,
  Subject
}

const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    db: new Prisma({
      typeDefs: 'database/generated/prisma.graphql',
      endpoint: 'http://localhost:4467',
      secret: 'marx2018',
      debug: true
    })
  }),
  resolverValidationOptions: {
    requireResolversForResolveType: false
  },
  cors: {
    origin: true,
    methods: ["GET,HEAD,PUT,PATCH,POST,DELETE"],
    preflightContinue: false
  }
})

server.start(() => console.log('🌍 Server is running on http://localhost:4000'))
