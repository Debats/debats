class RemoveTakenAtFromStatements < ActiveRecord::Migration
  def change
    remove_column :statements, :taken_at
  end
end
