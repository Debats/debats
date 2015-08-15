class AddProblemToSubjects < ActiveRecord::Migration
  def change
    add_column :subjects, :problem, :string
  end
end
