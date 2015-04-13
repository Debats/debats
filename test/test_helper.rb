ENV['RAILS_ENV'] ||= 'test'
require File.expand_path('../../config/environment', __FILE__)
require 'rails/test_help'
require 'minitest/reporters'
Minitest::Reporters.use!

class ActiveSupport::TestCase
  fixtures :all

  # Detect in current test is integration test
  def integration_test?
    defined? post_via_redirect
  end

  # Log in a test user
  def log_in_as(user, options = {})
    password = options[:password] || "password"
    remember_me = options[:remember_me] || "1"
    if integration_test?
      post login_path, session: { email: user.email,
                                  password: password,
                                  remember_me: remember_me }
    else
      session[:user_id] = user.id
    end
  end

  # Log out a test user
  def log_out(user)
    if integration_test?
      delete logout_path
    else
      user.forget
      cookies.delete(:user_id)
      cookies.delete(:remember_token)
      session.delete(:user_id)
    end
  end

  # Returns true if a test user is logged in.
  def is_logged_in?
    !session[:user_id].nil?
  end


end
