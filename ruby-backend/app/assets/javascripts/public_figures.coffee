$(document).ready ->
  $("input#name").bind('change', ->

    WikiPF = null

    try ->
      WikiPF = new WikipediaPublicFigure($(this).text)
    catch
      ## Rien trouvé => ne rien faire

    if WikiPF != null
      ok = "ok"
      ## Afficher le bloc "Importer le contenu de la page Wikipedia "Nicolas Sarkozy" ?"
      ## Remplir d'abord nom, intro et photo


  )
