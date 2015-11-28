class RemoveEvidenceDateFromEvidences < ActiveRecord::Migration
  def change
    remove_column :evidences, :evidence_date, :datetime
  end
end
