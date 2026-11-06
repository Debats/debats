defmodule Debats.Subjects.Position do
  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Subjects.Subject

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "positions" do
    field :description, :string
    field :title, :string
    belongs_to :subject, Subject

    timestamps()
  end

  @doc false
  def changeset(position, attrs) do
    position
    |> cast(attrs, [:title, :description])
    |> validate_required([:title, :description, :subject])
  end
end
