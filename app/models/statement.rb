class Statement < ActiveRecord::Base
  belongs_to :public_figure
  belongs_to :position
  has_many :evidences

  validates_presence_of :position_id
  validates_presence_of :public_figure_id
  validates_uniqueness_of :public_figure_id, scope: :position_id
  validate :at_least_one_evidence

  class << self

    def latest
      Statement.order(id: :desc).limit(5)
    end

  end

  private

    def at_least_one_evidence
      if evidences.reject(&:marked_for_destruction?).size < 1
        errors.add(:evidences, "Il faut au moins une preuve de cette prise de position")
      end
    end

end
