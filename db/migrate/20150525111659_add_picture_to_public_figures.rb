class AddPictureToPublicFigures < ActiveRecord::Migration
  def change
    add_column :public_figures, :picture, :string
  end
end
