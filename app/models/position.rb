class Position < ActiveRecord::Base
  belongs_to :subject
  has_many :statements, dependent: :destroy
  validates :subject_id, presence: true
  validates :title, presence: true
  validates :description, presence: true
  validate :at_least_one_statement

  private

  def at_least_one_statement
    if statements.size < 1
      errors.add("Il faut au moins une prise de position pour cette position")
    end
  end

end