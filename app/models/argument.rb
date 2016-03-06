class Argument < ActiveRecord::Base
  belongs_to :subject
  has_many :argument_in_statements
  has_many :statements, through: :argument_in_statements, source: :statement

  validates :name,        presence: true, length: {maximum: 100}
  validates :description,                 length: {maximum: 100}

end