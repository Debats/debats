class Subject < ActiveRecord::Base

  ## NAME VALIDATION
  validates :title,
      presence: true,
      length: {maximum: 50},
      uniqueness: {case_sensitive: false}

  ## PRESENTATION VALIDATION
  validates :presentation,
      presence: true
end
