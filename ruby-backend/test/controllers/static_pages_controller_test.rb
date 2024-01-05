require 'test_helper'

class StaticPagesControllerTest < ActionController::TestCase

  def setup
    @base_title = " | Débats.cc"
  end

  test "should get a_propos" do
    get :a_propos
    assert_response :success
    assert_select "title","À propos#{@base_title}"
  end

  test "should get contact" do
    get :contact
    assert_response :success
    assert_select "title", "Contact#{@base_title}"
  end
end
