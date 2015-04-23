class Position < ActiveRecord::Base
  belongs_to :subject
  has_many :statements, dependent: :destroy
  validates :subject_id, presence: true
  validates :title, presence: true
  validates :description, presence: true
end
