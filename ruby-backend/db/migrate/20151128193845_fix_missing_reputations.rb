class FixMissingReputations < ActiveRecord::Migration
  def change
    User.find_each do |u|
      u.reputation ||= 0
      u.save
    end
  end
end
