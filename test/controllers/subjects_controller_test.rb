require 'test_helper'

class SubjectsControllerTest < ActionController::TestCase
  test "should get new" do
    get :new
    assert_response :success
  end

  test "should get view" do
    get :view
    assert_response :success
  end

  test "should get list" do
    get :list
    assert_response :success
  end

end
