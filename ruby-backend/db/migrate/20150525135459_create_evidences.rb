class CreateEvidences < ActiveRecord::Migration
  def change
    create_table :evidences do |t|
      t.references :statement, index:true
      t.string :title
      t.string :url
      t.string :file

      t.timestamps null: false
    end
    add_foreign_key :evidences, :statements
  end
end
