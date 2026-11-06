defmodule Debats.Actors do
  @moduledoc """
  The Actors context.
  """

  import Ecto.Query, warn: false
  alias Debats.Repo

  alias Debats.Actors.PublicFigure

  @doc """
  Returns the list of public_figures.

  ## Examples

      iex> list_public_figures()
      [%PublicFigure{}, ...]

  """
  def list_public_figures do
    Repo.all(PublicFigure)
  end

  @doc """
  Gets a single public_figure.

  Raises `Ecto.NoResultsError` if the Public figure does not exist.

  ## Examples

      iex> get_public_figure!(123)
      %PublicFigure{}

      iex> get_public_figure!(456)
      ** (Ecto.NoResultsError)

  """
  def get_public_figure!(id), do: Repo.get!(PublicFigure, id)

  @doc """
  Creates a public_figure.

  ## Examples

      iex> create_public_figure(%{field: value})
      {:ok, %PublicFigure{}}

      iex> create_public_figure(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_public_figure(attrs \\ %{}) do
    %PublicFigure{}
    |> PublicFigure.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a public_figure.

  ## Examples

      iex> update_public_figure(public_figure, %{field: new_value})
      {:ok, %PublicFigure{}}

      iex> update_public_figure(public_figure, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_public_figure(%PublicFigure{} = public_figure, attrs) do
    public_figure
    |> PublicFigure.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a public_figure.

  ## Examples

      iex> delete_public_figure(public_figure)
      {:ok, %PublicFigure{}}

      iex> delete_public_figure(public_figure)
      {:error, %Ecto.Changeset{}}

  """
  def delete_public_figure(%PublicFigure{} = public_figure) do
    Repo.delete(public_figure)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking public_figure changes.

  ## Examples

      iex> change_public_figure(public_figure)
      %Ecto.Changeset{data: %PublicFigure{}}

  """
  def change_public_figure(%PublicFigure{} = public_figure, attrs \\ %{}) do
    PublicFigure.changeset(public_figure, attrs)
  end
end
