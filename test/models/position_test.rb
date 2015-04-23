require 'test_helper'

class PositionTest < ActiveSupport::TestCase

  def setup
    @subject = subjects(:one)
    @position = @subject.positions.build(title: "For", description: "People who think we should do it")
  end

  test "should be valid" do
    assert @position.valid?
  end

  test "subject should be present" do
    @position.subject_id = nil
    assert_not @position.valid?
  end

  test "title should be present" do
    @position.title = "      "
    assert_not @position.valid?
  end

  test "description should be present" do
    @position.description = "        "
    assert_not @position.valid?
  end

end
