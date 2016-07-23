class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  include ApplicationHelper
  include SessionsHelper
  include ActionView::Helpers::TextHelper

  before_action :set_locale

  def respond_modal_with(*args, &blk) #TODO blk ?
    options = args.extract_options!
    options[:responder] = ModalResponder
    respond_with *args, options, &blk
  end

  private

    # Before Filters
    def set_locale
      I18n.locale = params[:locale] || I18n.default_locale
    end

    ## Adding locale to URLs
    ##def default_url_options (options = {})
      #{locale: I18n.locale}.merge options
    ## end

    # only if logged in
    def logged_in_user
      unless logged_in?
        store_location
        flash[:danger] = "Vous devez être identifié."
        redirect_to login_url
      end
    end
end
