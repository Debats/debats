defmodule Debats.Accounts.Credential do
  @moduledoc """
    Represents a user credential
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Accounts.User

  @primary_key false
  @foreign_key_type :binary_id
  schema "credentials" do
    field :password, :string, virtual: true
    field :password_hash, :string
    belongs_to :user, User

    timestamps()
  end

  def changeset(credential, params) do
    credential
    |> cast(params, [:password])
    |> validate_required([:password])
    |> validate_length(:password, min: 6, max: 100)
    |> hash_password()
  end

  @spec hash_password(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  defp hash_password(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{password: password}} ->
        put_change(changeset, :password_hash, Argon2.hash_pwd_salt(password))

      _ ->
        changeset
    end
  end
end
