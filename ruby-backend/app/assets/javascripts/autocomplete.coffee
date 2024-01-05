$(document).ready ->
  $(".Autocomplete").bind('railsAutocomplete.select', ->
    element = $(this).attr("data-id-element")
    $(element).trigger("change")
  )
