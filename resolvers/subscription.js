const newSubject = {
  subscribe: (parent, args, context, info) =>
    context.db.subscription.subject({
      where: { mutation_in: ['CREATED'] }
    }, info)
}

module.exports = { newSubject }
