defmodule Debats.Repo.Migrations.CreateCredentials do
  use Ecto.Migration

  def change do
    create table(:credentials) do
      add :user_id, references(:users, type: :uuid, on_delete: :delete_all), null: false
      add :password_hash, :string, null: false

      timestamps()
    end

    create unique_index(:credentials, [:user_id])
  end
end
