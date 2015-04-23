class PublicFigure < ActiveRecord::Base
  has_many :statements, dependent: :destroy
end
