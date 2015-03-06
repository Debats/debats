require 'test_helper'

class UsersSignupTest < ActionDispatch::IntegrationTest

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

  test "valid user should be created" do
    get new_user_path
    assert_difference "User.count" do
      post_via_redirect users_path, user: {name: "John Doe", email: "john@doe.com", password: "123456789", password_confirmation: "123456789"}
    end
    assert_response :success
    assert_template "users/show"
    assert_select 'div#error_explanation', false
    assert_select 'div.field_with_errors', false
    assert flash[:success]
  end

end
