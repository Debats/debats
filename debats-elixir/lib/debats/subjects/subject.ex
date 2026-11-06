defmodule Debats.Subjects.Subject do
  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Subjects.{Position, Claim}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "subjects" do
    field :description, :string
    field :title, :string
    has_many :positions, Position
    has_many :claims, Claim

    timestamps()
  end

  @doc false
  def changeset(subject, attrs) do
    subject
    |> cast(attrs, [:title, :description])
    |> validate_required([:title, :description])
  end
end
