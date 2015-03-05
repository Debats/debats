module ApplicationHelper

  # Returns the full title of the page
  def full_title(page_title = '')
    base_title = "Débats.fr"
    if page_title.empty?
      base_title
    else
      "#{page_title} | #{base_title}"
    end
  end

end
