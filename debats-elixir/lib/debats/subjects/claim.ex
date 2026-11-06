defmodule Debats.Subjects.Claim do
  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Subjects.Subject

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "claims" do
    field :description, :string
    field :title, :string
    belongs_to :subject, Subject

    timestamps()
  end

  @doc false
  def changeset(claim, attrs) do
    claim
    |> cast(attrs, [:title, :description])
    |> validate_required([:title, :description])
  end
end
