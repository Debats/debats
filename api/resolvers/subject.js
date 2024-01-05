const { pipe, map, flatten, uniqBy, propEq, pluck } = require('ramda')

module.exports = {
  publicFigures: async (subject, args, context, info) => {
    if (!subject.id) throw new Error("Cannot ask for publicFigure without subjects' IDs")
    console.log('root', subject)
    const positionsWithPublicFigures = await context.db.query.positions(
      { where: { subject: { id: subject.id } } },
      `{ statements { publicFigure { id name slug } } }`
    )
    const publicFigures = pipe(
      pluck('statements'),
      map(pluck('publicFigure')),
      flatten,
      uniqBy(propEq('id'))
    )(positionsWithPublicFigures)
    console.log("positionsWithPublicFigures", subject.id, JSON.stringify(positionsWithPublicFigures))
    console.log("positionsWithPublicFigures", subject.id, JSON.stringify(positionsWithPublicFigures))
    console.log("publicFigures", publicFigures)
    return publicFigures
  }
}
