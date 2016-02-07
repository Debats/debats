class Argument < ActiveRecord::Base
  belongs_to :statement
  belongs_to :position

  validates :name,        presence: true, length: {maximum: 100}
  validates :description,                 length: {maximum: 100}
  validates_uniqueness_of :statement_id, scope: :position_id

end
