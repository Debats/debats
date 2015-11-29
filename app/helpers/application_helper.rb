module ApplicationHelper

  # Returns the full title of the page
  def full_title(page_title = '')
    base_title = "".html_safe
    base_title << APP_NAME_WITH_DOMAIN_EXT
    if page_title.empty?
      base_title
    else
      full = "".html_safe
      full << page_title
      full << " | "
      full << base_title
      full
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

  def allowed_to(action)
    return false if current_user.nil?
    min_rank = REPUTATION_CONFIG["can"][action.to_s]
    if (min_rank)
      min_reputation = REPUTATION_CONFIG["ranks"][min_rank]
      return current_user.reputation >= min_reputation
    else
      # TODO log exception
      return false
    end
  end

end
