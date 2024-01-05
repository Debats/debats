class CreatePositions < ActiveRecord::Migration
  def change
    create_table :positions do |t|
      t.string :title
      t.text :description
      t.references :subject, index: true

      t.timestamps null: false
    end
    add_foreign_key :positions, :subjects
  end
end
