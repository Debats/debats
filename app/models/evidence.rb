class Evidence < ActiveRecord::Base
  belongs_to :statement
  mount_uploader :file, PictureUploader

  validates :statement, presence: true
  validates :title, presence: true, length: {maximum: 100}
  validates :fact_date, presence: true
  validates :evidence_date, presence: true

  validate :either_url_or_file

  private

    def either_url_or_file
      if !url? && !file?
        errors.add(:evidence_title, "Vous devez indiquer soit un lien Internet soit un fichier")
      end
    end

end
