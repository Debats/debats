defmodule Debats.Repo.Migrations.CreateEvidences do
  use Ecto.Migration

  def change do
    create table(:evidences, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :source, :string, null: false
      add :url, :string, null: false
      add :quote, :text, null: false
      add :date, :date, null: false

      add :statement_id, references(:statements, on_delete: :restrict, type: :binary_id),
        null: false

      timestamps()
    end
  end
end
