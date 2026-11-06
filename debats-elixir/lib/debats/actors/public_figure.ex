defmodule Debats.Actors.PublicFigure do
  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Statements.Statement

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "public_figures" do
    field :intro, :string
    field :name, :string
    field :wikipedia_url, :string
    has_many :statements, Statement

    timestamps()
  end

  @doc false
  def changeset(public_figure, attrs) do
    public_figure
    |> cast(attrs, [:name, :intro, :wikipedia_url])
    |> validate_required([:name, :intro, :wikipedia_url])
  end
end
