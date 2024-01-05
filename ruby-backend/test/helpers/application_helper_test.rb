require "test_helper"
require "application_helper"
require "sessions_helper"

class ReputationHelper < ActionView::TestCase
  include ApplicationHelper
  include SessionsHelper

  def setup
    @user = users(:Jalil)
  end


  test "user should get reputation associated with action" do
    user = users(:JohnDoe)
    log_in_as(user)
    current_user.reputation = 0
    current_user.save
    new_action = :added_subject
    grant_reputation_for!(new_action)
    assert current_user.reputation==REPUTATION_CONFIG["actions_to_reputation"][new_action.to_s]
  end

end