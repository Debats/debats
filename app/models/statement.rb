class Statement < ActiveRecord::Base
  belongs_to :subject
  belongs_to :position
  belongs_to :public_figure
  validates :subject_id, presence: true
  validates :position_id, presence: true
  validates :public_figure_id, presence: true
  validates :taken_at, {presence: true}
end
