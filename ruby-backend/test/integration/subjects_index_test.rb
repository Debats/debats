require 'test_helper'

class SubjectsIndexTest < ActionDispatch::IntegrationTest

  test "index including pagination" do
    get subjects_path
    assert_template 'subjects/index'
    assert_select 'div.pagination'
    Subject.paginate(page: 1).each do |subject|
      assert_select 'a[href=?]', subject_path(subject), text: subject.title
    end
  end
end