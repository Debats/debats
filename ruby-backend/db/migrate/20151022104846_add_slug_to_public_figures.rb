class AddSlugToPublicFigures < ActiveRecord::Migration
  def up
    add_column :public_figures, :slug, :string
    add_index :public_figures, :slug, unique: true
    PublicFigure.reset_column_information   # Refresh model
    PublicFigure.find_each(&:save)          # Generate slug for every existing record
  end

  def down
    remove_index :public_figures, :slug
    remove_column :public_figures, :slug, unique: true
  end
end
