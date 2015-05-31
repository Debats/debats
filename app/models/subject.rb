class Subject < ActiveRecord::Base
  has_many :positions, dependent: :destroy
  has_many :statements, through: :positions, source: :statements
  mount_uploader :picture, PictureUploader

  ## NAME VALIDATION
  validates :title,
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
        errors.add(:picture, t("image_must_not_be_bigger_than", size: 5, unit:t("mb")))
      end
    end

end
