defmodule Debats.Statements.Statement do
  use Ecto.Schema
  import Ecto.Changeset

  alias Debats.Subjects.{Subject, Position}
  alias Debats.Actors.PublicFigure
  alias Debats.Subjects.Claim

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "statements" do
    field :date, :date
    field :evidence_source, :string
    field :evidence_url, :string
    field :quote, :string
    belongs_to :public_figure, PublicFigure
    belongs_to :subject, Subject
    belongs_to :position, Position
    many_to_many :claims, Claim, join_through: "claims_statements"

    timestamps()
  end

  @doc false
  def changeset(statement, attrs) do
    statement
    |> cast(attrs, [:evidence_source, :evidence_url, :quote, :date])
    |> validate_required([:evidence_source, :evidence_url, :quote, :date])
  end
end
