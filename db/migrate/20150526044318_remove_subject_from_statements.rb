class RemoveSubjectFromStatement < ActiveRecord::Migration
  def change
    remove_column :statements, :subject_id
  end
end
