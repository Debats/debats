defmodule Debats.Repo.Migrations.CreatePositions do
  use Ecto.Migration

  def change do
    create table(:positions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :description, :text, null: false
      add :subject_id, references(:subjects, on_delete: :restrict, type: :binary_id), null: false

      timestamps()
    end

    create unique_index(:positions, [:subject_id, :title])
  end
end
