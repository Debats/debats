const subject = (root, args, context, info) =>
  context.db.query.subjects({ where: { id: args.id } }, info)

const subjects = (root, args, context, info) => {
  const where = args.filter
  ? {
    OR: [
      { title_contains: args.filter },
      { description_contains: args.filter }
    ]
  }
  : {}
  return context.db.query.subjects({
    where,
    last: args.last,
    skip: args.skip,
    orderBy: 'createdAt_ASC'
  }, info)
}

const positions = (root, args, context, info) => {
  console.log("args", args)
  return context.db.query.positions({
    where: { subject: { id: args.subjectId } },
    orderBy: 'createdAt_ASC'
  }, info)
}

module.exports = {
  subject,
  subjects,
  positions
}
