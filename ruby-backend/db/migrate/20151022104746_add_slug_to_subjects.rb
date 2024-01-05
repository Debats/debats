class AddSlugToSubjects < ActiveRecord::Migration
  def up
    add_column :subjects, :slug, :string
    add_index :subjects, :slug, unique: true
    Subject.reset_column_information   # Refresh model
    Subject.find_each(&:save)          # Generate slug for every existing record
  end

  def down
    remove_index :subjects, :slug
    remove_column :subjects, :slug, unique: true
  end
end
