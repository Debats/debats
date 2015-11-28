class PublicFigure < ActiveRecord::Base
  has_many :statements, dependent: :destroy
  mount_uploader :picture, PictureUploader

  ## VALIDATION
  validates_presence_of :name, :presentation
  validates :name, length: {maximum: 100},  uniqueness: {case_sensitive: false}
  validates :slug, length: {minimum: 3},    uniqueness: {case_sensitive: false}
  validate :picture_size

  # Friendly ID
  extend FriendlyId
  friendly_id :name, use: [:slugged, :finders, :history]

  def should_generate_new_friendly_id?
    name_changed? || super
  end

  private

  def picture_size
    if picture.size > 5.megabytes
      errors.add(:picture, "L'image ne doit pas dépasser 5 Mo")
    end
  end

end
