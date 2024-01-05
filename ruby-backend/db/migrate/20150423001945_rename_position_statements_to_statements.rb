class RenamePositionStatementsToStatements < ActiveRecord::Migration
  def change
    rename_table :position_statements, :statements
  end
end
