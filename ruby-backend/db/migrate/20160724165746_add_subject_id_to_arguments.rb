class AddSubjectIdToArguments < ActiveRecord::Migration
  def change
    add_column :arguments, :subject_id, :integer
  end
end
