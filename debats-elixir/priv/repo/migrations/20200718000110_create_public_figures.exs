defmodule Debats.Repo.Migrations.CreatePublicFigures do
  use Ecto.Migration

  def change do
    create table(:public_figures, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :intro, :text, null: false
      add :wikipedia_url, :string, null: false

      timestamps()
    end

    create unique_index(:public_figures, [:name])
    create unique_index(:public_figures, [:wikipedia_url])
  end
end
