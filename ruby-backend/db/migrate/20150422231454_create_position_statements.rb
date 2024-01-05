class CreatePositionStatements < ActiveRecord::Migration
  def change
    create_table :position_statements do |t|
      t.references :subject, index: true
      t.references :position, index: true
      t.references :public_figure, index: true
      t.datetime :taken_at

      t.timestamps null: false
    end
    add_foreign_key :position_statements, :subjects
    add_foreign_key :position_statements, :positions
    add_foreign_key :position_statements, :public_figures
  end
end
