class PublicFigure < ActiveRecord::Base
  has_many :statements, dependent: :destroy
  has_many :positions, through: :statements, source: :position
  has_many :subjects, through: :positions, source: :subject
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

  def associated_subjects
    statements                                # Statements of this personality
        .reject(&:new_record?)                # Ignore new records
        .map(&:position)                      # get position of each statement
        .map(&:subject)                       # get subject of each position
        .uniq                                 # dedupe
  end

  def major?
    created_at > 1.week.ago || statements.size > 2
  end

  def minor?
    !major?
  end

  private

  def picture_size
    if picture.size > 5.megabytes
      errors.add(:picture, "L'image ne doit pas dépasser 5 Mo")
    end
  end

end
