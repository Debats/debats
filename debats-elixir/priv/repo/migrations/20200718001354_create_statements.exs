defmodule Debats.Repo.Migrations.CreateStatements do
  use Ecto.Migration

  def change do
    create table(:statements, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false

      add :public_figure_id, references(:public_figures, on_delete: :restrict, type: :binary_id),
        null: false

      add :subject_id, references(:subjects, on_delete: :restrict, type: :binary_id), null: false

      add :position_id, references(:positions, on_delete: :restrict, type: :binary_id),
        null: false

      timestamps()
    end
  end
end
