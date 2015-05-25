require 'test_helper'

class SubjectsInterfaceTest < ActionDispatch::IntegrationTest

  def setup
    @user = users(:Jalil)
  end

  test "correct image upload" do
    log_in_as @user
    get new_subject_path
    assert_select 'form'
    assert_select 'input[type=file]'

    ## invalid post
    post subjects_path, subject: {content: ""}
    assert_select 'div#error_explanation'

    ## valid submission
    title = "This subject is really important"
    presentation = "and this is why"
    picture = fixture_file_upload('test/fixtures/test.jpg', 'image/jpeg')
    assert_difference "Subject.count", 1 do
      post subjects_path, subject: {title: title, presentation: presentation, picture: picture}
    end
    subject = assigns(:subject)
    assert subject.picture?
    follow_redirect!
    assert_match title, response.body
    assert_match presentation, response.body
    assert_select "h1", subject.title

    ## delete a post
    assert_select "a[data-method=delete]"
    assert_difference "Subject.count", -1 do
      delete subject_path subject
    end

  end

end