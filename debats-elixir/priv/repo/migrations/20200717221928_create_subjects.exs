defmodule Debats.Repo.Migrations.CreateSubjects do
  use Ecto.Migration

  def change do
    create table(:subjects, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :description, :text, null: false

      timestamps()
    end

    create unique_index(:subjects, [:title])
  end
end
