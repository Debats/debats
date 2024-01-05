class CreateSubjects < ActiveRecord::Migration
  def change
    create_table :subjects do |t|
      t.string :title
      t.string :presentation

      t.timestamps null: false
    end
  end
end
