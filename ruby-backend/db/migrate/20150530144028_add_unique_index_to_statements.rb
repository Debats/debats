class AddUniqueIndexToStatements < ActiveRecord::Migration
  def change
    add_index :statements, [:position_id, :public_figure_id], :unique => true
  end
end
