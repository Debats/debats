class CreateArguments < ActiveRecord::Migration
  def change
    create_table :arguments do |t|
      t.string :name
      t.string :description

      t.timestamps null: false
    end
  end
end
