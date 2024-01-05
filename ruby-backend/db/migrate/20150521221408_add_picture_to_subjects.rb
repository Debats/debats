class AddPictureToSubjects < ActiveRecord::Migration
  def change
    add_column :subjects, :picture, :string
  end
end
