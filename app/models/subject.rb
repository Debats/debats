class Subject < ActiveRecord::Base
  has_many :positions, dependent: :destroy
  has_many :arguments, dependent: :destroy
  has_many :statements, through: :positions, source: :statements
  mount_uploader :picture, PictureUploader

  ## VALIDATIONS
  validates_presence_of :title, :slug, :presentation, :problem
  validates :title, length: {maximum: 100}, uniqueness: {case_sensitive: false}
  validates :slug, length: {minimum: 3}, uniqueness: {case_sensitive: false}
  validate :picture_size

  # Friendly ID
  extend FriendlyId
  friendly_id :title, use: [:slugged, :finders, :history]

  def should_generate_new_friendly_id?
    title_changed? || super
  end

  def associated_public_figures
    statements.map(&:public_figure).flatten
  end

  def get_positions_for_public_figure(public_figure)
    #TODO performance optimization
    statements                                            # Liste des prises de position liées à ce sujet ...
        .select { |s| s.public_figure == public_figure }  # ... et à cette personnalité
        .map(&:position)                                  # On récupère la position de chacune de ces prises de positions
        .uniq                                             # Dedup
  end

  private

    def picture_size
      if picture.size > 5.megabytes
        errors.add(:picture, t("image_must_not_be_bigger_than", size: 5, unit:t("mb")))
      end
    end

end
