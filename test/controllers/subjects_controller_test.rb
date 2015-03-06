require 'test_helper'

class SubjectsControllerTest < ActionController::TestCase
  test "should get new" do
    get :new
    assert_response :success
  end

  test "should get list" do
    get :index
    assert_response :success
  end

end
