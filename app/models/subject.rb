class Subject < ActiveRecord::Base

  ## NAME VALIDATION
  validates :title,
      presence: true,
      length: {maximum: 50}

  ## PRESENTATION VALIDATION
  validates :presentation,
      presence: true
end
