require 'test_helper'

class SubjectTest < ActiveSupport::TestCase

  def setup
    @subject = Subject.new(title: "Nouveau sujet", presentation: "Long text here")
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
    @subject.title = "a" * 101
    assert_not @subject.valid?
  end

  test "title should be unique" do
    dup_subject = @subject.dup
    dup_subject.title = @subject.title.upcase
    @subject.title.downcase!
    @subject.save
    assert_not dup_subject.valid?
  end


end
