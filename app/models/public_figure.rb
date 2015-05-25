class PublicFigure < ActiveRecord::Base
  has_many :statements, dependent: :destroy
  mount_uploader :picture, PictureUploader

  ## NAME VALIDATION
  validates :name,
            presence: true,
            length: {maximum: 100},
            uniqueness: {case_sensitive: false}

  ## PRESENTATION VALIDATION
  validates :presentation,
            presence: true

  validate :picture_size

  private

  def picture_size
    if picture.size > 5.megabytes
      errors.add(:picture, "L'image ne doit pas dépasser 5 Mo")
    end
  end

end
