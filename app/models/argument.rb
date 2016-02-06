class Argument < ActiveRecord::Base
  belongs_to :statement

  validates :name,        presence: true, length: {maximum: 100}
  validates :description,                 length: {maximum: 100}


end
