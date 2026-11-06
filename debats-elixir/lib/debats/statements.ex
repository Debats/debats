defmodule Debats.Statements do
  @moduledoc """
  The Statements context.
  """

  import Ecto.Query, warn: false
  alias Debats.Repo

  alias Debats.Statements.Statement

  @doc """
  Returns the list of statements.

  ## Examples

      iex> list_statements()
      [%Statement{}, ...]

  """
  def list_statements do
    Repo.all(Statement)
  end

  @doc """
  Gets a single statement.

  Raises `Ecto.NoResultsError` if the Statement does not exist.

  ## Examples

      iex> get_statement!(123)
      %Statement{}

      iex> get_statement!(456)
      ** (Ecto.NoResultsError)

  """
  def get_statement!(id), do: Repo.get!(Statement, id)

  @doc """
  Creates a statement.

  ## Examples

      iex> create_statement(%{field: value})
      {:ok, %Statement{}}

      iex> create_statement(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_statement(attrs \\ %{}) do
    %Statement{}
    |> Statement.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a statement.

  ## Examples

      iex> update_statement(statement, %{field: new_value})
      {:ok, %Statement{}}

      iex> update_statement(statement, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_statement(%Statement{} = statement, attrs) do
    statement
    |> Statement.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a statement.

  ## Examples

      iex> delete_statement(statement)
      {:ok, %Statement{}}

      iex> delete_statement(statement)
      {:error, %Ecto.Changeset{}}

  """
  def delete_statement(%Statement{} = statement) do
    Repo.delete(statement)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking statement changes.

  ## Examples

      iex> change_statement(statement)
      %Ecto.Changeset{data: %Statement{}}

  """
  def change_statement(%Statement{} = statement, attrs \\ %{}) do
    Statement.changeset(statement, attrs)
  end
end
