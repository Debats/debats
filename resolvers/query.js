const { pipe, pick, reject, isNil } = require('ramda')

const subject = (root, args, context, info) => context.db.query.subjects({
  where: { id: args.id }
}, info)

const subjects = (root, args, context, info) => context.db.query.subjects({
  where: args.filter
    ? {
      OR: [
        { title_contains: args.filter },
        { description_contains: args.filter }
      ]
    }
    : {},
  last: args.last,
  skip: args.skip,
  orderBy: 'createdAt_DESC'
}, info)

const publicFigure = (root, args, context, info) => context.db.query.publicFigure({
  where: pipe(pick(['id', 'slug']), reject(isNil))(args)
}, info)

const publicFigures = (root, args, context, info) => context.db.query.publicFigures({
  where: args.filter
    ? { name_contains: args.filter }
    : {},
  last: args.last,
  skip: args.skip,
  orderBy: 'name_ASC'
}, info)

const positions = (root, args, context, info) => context.db.query.positions({
  where: { subject: { id: args.subjectId } },
  orderBy: 'createdAt_DESC'
}, info)

const statements = (root, args, context, info) => context.db.query.statements({
  last: args.last,
  skip: args.skip,
  orderBy: 'createdAt_DESC'
}, info)

module.exports = {
  subject,
  subjects,
  positions,
  statements,
  publicFigure,
  publicFigures
}
