require 'test_helper'

class ArgumentsControllerTest < ActionController::TestCase

  test "should redirect create when not logged in" do
    assert_no_difference "Argument.count" do
      post :create, name:"Parce que"
    end
    assert_redirected_to login_url
  end

  test "should redirect create when insufficient reputation" do
    log_in_as(users(:JohnDoe))
    assert_no_difference "Argument.count" do
      post :create, name:"Parce que"
    end
    assert_response :error
  end

  test "should create new argument if sufficient reputation" do
    log_in_as(users(:Jalil))
    assert_difference "Argument.count", 1 do
      post :create, name:"Parce que"
    end
    assert_redirected_to root_url
  end

end
