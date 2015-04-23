class Subject < ActiveRecord::Base
  has_many :positions, dependent: :destroy
  has_many :statements, dependent: :destroy


  ## NAME VALIDATION
  validates :title,
      presence: true,
      length: {maximum: 100},
      uniqueness: {case_sensitive: false}

  ## PRESENTATION VALIDATION
  validates :presentation,
      presence: true
end
