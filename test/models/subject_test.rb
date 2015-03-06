require 'test_helper'

class SubjectTest < ActiveSupport::TestCase

  def setup
    @subject = Subject.new(title: "L'euthanasie", presentation: "Long text here")
  end

  test "should be valid" do
    assert @subject.valid?
  end

  test "title should be present" do
    @subject.title = "         "
    assert_not @subject.valid?
  end

  test "presentation should be present" do
    @subject.presentation = "           "
    assert_not @subject.valid?
  end

  test "title should not be too long" do
    @subject.title = "a" * 51
    assert_not @subject.valid?
  end

end
