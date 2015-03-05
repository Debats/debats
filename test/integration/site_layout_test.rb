require 'test_helper'

class SiteLayoutTest < ActionDispatch::IntegrationTest

  test "layout links" do
    get root_path
    assert_template "static_pages/a_propos"
    assert_select "a[href=?]", root_path
    assert_select "a[href=?]", a_propos_path, count:2
    assert_select "a[href=?]", contact_path
  end

end
