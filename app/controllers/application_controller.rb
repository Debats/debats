class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  include SessionsHelper
  include ActionView::Helpers::TextHelper

  private

    # Before Filters

    # only if logged in
    def logged_in_user
      unless logged_in?
        store_location
        flash[:danger] = "Vous devez être identifié."
        redirect_to login_url
      end
    end
end
