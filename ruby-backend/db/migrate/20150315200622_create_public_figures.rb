class CreatePublicFigures < ActiveRecord::Migration
  def change
    create_table :public_figures do |t|
      t.string :name
      t.string :presentation
      t.string :wikipedia_url
      t.string :website_url

      t.timestamps null: false
    end
  end
end
