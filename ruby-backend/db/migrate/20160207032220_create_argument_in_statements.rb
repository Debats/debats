class CreateArgumentInStatements < ActiveRecord::Migration
  def change
    create_table :argument_in_statements do |t|

      t.timestamps null: false
    end
  end
end
