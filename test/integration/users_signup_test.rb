require 'test_helper'

class UsersSignupTest < ActionDispatch::IntegrationTest

  def setup
    ActionMailer::Base.deliveries.clear
  end

  test "invalid user should not be created" do
    get new_user_path
    assert_no_difference "User.count" do
      post users_path, user: {name: "", email: "user@invalid", password: "pwd", password_confirmation: "pw"}
    end
    assert_template "users/new"
    assert_select 'div#error_explanation'
    assert_select 'div.field_with_errors'
    assert_not flash[:success]
  end

  test "valid user should be created and then account activated" do
    get new_user_path
    # User creation test
    assert_difference "User.count", 1 do
      post users_path, user: {name: "John Doe", email: "john@doe.com", password: "123456789", password_confirmation: "123456789"}
    end
    user = assigns(:user)
    # Login et redirection test
    follow_redirect!
    assert_response :success
    assert_template "users/show"
    assert is_logged_in?
    assert_select 'div#error_explanation', false
    assert_select 'div.field_with_errors', false
    assert flash[:success]
    # Activation email test
    assert_not user.activated?
    assert_equal 1, ActionMailer::Base.deliveries.size
    # log out
    log_out(user)
    assert_not is_logged_in?
    # Click email with invalid activation token
    get edit_account_activation_path("invalid token")
    assert_not user.reload.activated?
    assert_not is_logged_in?
    assert_not flash[:success]
    assert flash[:danger]
    # click email with valid token but wrong email
    get edit_account_activation_path(user.activation_token, email:"wrong")
    assert_not user.reload.activated?
    assert_not is_logged_in?
    assert_not flash[:success]
    assert flash[:danger]
    # click valid email activation link
    get edit_account_activation_path(user.activation_token, email: user.email)
    assert user.reload.activated?
    follow_redirect!
    assert is_logged_in?
    assert flash[:success]
    assert_not flash[:danger]
    assert_template "users/show"
  end

end
