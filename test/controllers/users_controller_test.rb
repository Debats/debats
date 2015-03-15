require 'test_helper'

class UsersControllerTest < ActionController::TestCase

  def setup
    @jalil = users(:Jalil)
    @mehdi = users(:Mehdi)
  end

  test "should get new" do
    get :new
    assert_response :success
  end

  test "should redirect edit when not logged in" do
    get :edit, id: @jalil
    assert_not flash.empty?
    assert_redirected_to login_url
  end

  test "should redirect update when not logged in" do
    patch :update, id: @jalil, user: { name: @jalil.name, email: @jalil.email }
    assert_not flash.empty?
    assert_redirected_to login_url
  end

  test "should redirect edit when logged in as wrong user" do
    log_in_as(@mehdi)
    get :edit, id: @jalil
    assert flash.empty?
    assert_redirected_to root_url
  end

  test "should redirect update when logged in as wrong user" do
    log_in_as(@mehdi)
    patch :update, id: @jalil, user: { name: @jalil.name, email: @jalil.email }
    assert flash.empty?
    assert_redirected_to root_url
  end

end
