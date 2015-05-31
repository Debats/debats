module ApplicationHelper

  # Returns the full title of the page
  def full_title(page_title = '')
    base_title = APP_NAME_WITH_DOMAIN_EXT
    if page_title.empty?
      base_title
    else
      "#{page_title} | #{base_title}"
    end
  end

  def bootstrap_class_for_flash_type flash_type
    { success: "alert-success", error: "alert-danger", alert: "alert-warning", notice: "alert-info" }[flash_type] || flash_type.to_s
  end

  def flash_messages(opts = {})
    flash.each do |msg_type, message|
      concat(content_tag(:div, message, class: "alert alert-#{msg_type} fade in") do
               concat content_tag(:button, 'X', class: "close", data: { dismiss: 'alert' })
               concat message
             end)
    end
    nil
  end

end
