class Wikipedia

  searchFor: (text) ->
    # Code commun pour la recherche d'une page Wikipedia ?


class WikipediaPublicFigure extends Wikipedia

  constructor: (name) ->
    super()
    @init(name)

  init: ($select) ->
    # Ici code scraping page Wikipedia de la personnalité et remplissage
    # Si rien trouvé exception
    @fullName = ""
    @intro = ""
    @photoUrl = ""

  getFullName: ->
    return @fullName

  getIntro: ->
    return @intro

  getPhotoUrl: ->
    return @photoUrl

