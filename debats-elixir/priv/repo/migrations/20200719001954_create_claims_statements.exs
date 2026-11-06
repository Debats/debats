defmodule Debats.Repo.Migrations.CreateClaimsStatements do
  use Ecto.Migration

  def change do
    create table(:claims_statements, primary_key: false) do
      add :claim_id, references(:claims, on_delete: :restrict, type: :binary_id), null: false

      add :statement_id, references(:statements, on_delete: :restrict, type: :binary_id),
        null: false

      timestamps()
    end

    create unique_index(:claims_statements, [:claim_id, :statement_id])
    create unique_index(:claims_statements, [:statement_id, :claim_id])
  end
end
