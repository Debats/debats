defmodule Debats.Accounts.User do
  @moduledoc """
    Represents a local user
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Accounts.Credential

  @mail_regex ~r/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :name, :string
    has_one :credential, Credential

    timestamps()
  end

  @doc false
  @spec changeset(__MODULE__, map) :: Ecto.Changeset.t()
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email])
    |> validate_required([:name, :email])
    |> validate_format(:email, @mail_regex)
  end
end
