require 'test_helper'

class SubjectPageActionsTest < ActionDispatch::IntegrationTest

  # test "delete button should not show if reputation < 1000" do
  #   log_in_as users(:JohnDoe)
  #   subject = subjects(:one)
  #   get subject_path(subject)
  #   assert_template 'subjects/show'
  #   assert_select "a[href=?]", subject_path(subject), method: :delete, count:0
  #   assert_no_difference "Subject.count" do
  #     delete subject_path(subject)
  #   end
  # end

  test "delete button should show and work if reputation >= 1000" do
    log_in_as users(:Jalil)
    subject = subjects(:euthanasie)
    get subject_path(subject)
    assert_template 'subjects/show'
    assert_select "a[href=?]", subject_path(subject), method: :delete, count:1
    assert_difference "Subject.count", -1 do
      delete subject_path(subject)
    end
  end

end
