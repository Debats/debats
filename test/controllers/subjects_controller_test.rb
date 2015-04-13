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

  test "should redirect destroy when not logged in" do
    assert_no_difference "Subject.count" do
      delete :destroy, id:subjects(:one)
    end
    assert_redirected_to login_url
  end

  test "should redirect destroy when insufficient reputation" do
    log_in_as(users(:JohnDoe))
    assert_no_difference "Subject.count" do
      delete :destroy, id:subjects(:one)
    end
    assert_redirected_to subject_url(subjects(:one))
  end

end
