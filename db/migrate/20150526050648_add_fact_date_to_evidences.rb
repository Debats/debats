class AddFactDateToEvidences < ActiveRecord::Migration
  def change
    add_column :evidences, :fact_date, :datetime
    add_column :evidences, :evidence_date, :datetime
  end
end
