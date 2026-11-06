defmodule Debats.Subjects do
  @moduledoc """
  The Subjects context.
  """

  import Ecto.Query, warn: false
  alias Debats.Repo

  alias Debats.Subjects.Subject

  @doc """
  Returns the list of subjects.

  ## Examples

      iex> list_subjects()
      [%Subject{}, ...]

  """
  def list_subjects do
    Repo.all(Subject)
  end

  def list_subjects_with_positions do
    list_subjects() |> Repo.preload(:positions)
  end

  @doc """
  Gets a single subject.

  Raises `Ecto.NoResultsError` if the Subject does not exist.

  ## Examples

      iex> get_subject!(123)
      %Subject{}

      iex> get_subject!(456)
      ** (Ecto.NoResultsError)

  """
  def get_subject!(id), do: Repo.get!(Subject, id) |> Repo.preload([:positions])

  @doc """
  Creates a subject.

  ## Examples

      iex> create_subject(%{field: value})
      {:ok, %Subject{}}

      iex> create_subject(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_subject(attrs \\ %{}) do
    %Subject{}
    |> Subject.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a subject.

  ## Examples

      iex> update_subject(subject, %{field: new_value})
      {:ok, %Subject{}}

      iex> update_subject(subject, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_subject(%Subject{} = subject, attrs) do
    subject
    |> Subject.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a subject.

  ## Examples

      iex> delete_subject(subject)
      {:ok, %Subject{}}

      iex> delete_subject(subject)
      {:error, %Ecto.Changeset{}}

  """
  def delete_subject(%Subject{} = subject) do
    Repo.delete(subject)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking subject changes.

  ## Examples

      iex> change_subject(subject)
      %Ecto.Changeset{data: %Subject{}}

  """
  def change_subject(%Subject{} = subject, attrs \\ %{}) do
    Subject.changeset(subject, attrs)
  end

  def new_subject(), do: change_subject(%Subject{})

  alias Debats.Subjects.Position

  @doc """
  Returns the list of positions.

  ## Examples

      iex> list_positions()
      [%Position{}, ...]

  """
  def list_positions do
    Repo.all(Position)
  end

  @doc """
  Gets a single position.

  Raises `Ecto.NoResultsError` if the Position does not exist.

  ## Examples

      iex> get_position!(123)
      %Position{}

      iex> get_position!(456)
      ** (Ecto.NoResultsError)

  """
  def get_position!(id), do: Repo.get!(Position, id)

  @doc """
  Creates a position.

  ## Examples

      iex> create_position(%{field: value})
      {:ok, %Position{}}

      iex> create_position(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_position(attrs \\ %{}) do
    %Position{}
    |> Position.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a position.

  ## Examples

      iex> update_position(position, %{field: new_value})
      {:ok, %Position{}}

      iex> update_position(position, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_position(%Position{} = position, attrs) do
    position
    |> Position.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a position.

  ## Examples

      iex> delete_position(position)
      {:ok, %Position{}}

      iex> delete_position(position)
      {:error, %Ecto.Changeset{}}

  """
  def delete_position(%Position{} = position) do
    Repo.delete(position)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking position changes.

  ## Examples

      iex> change_position(position)
      %Ecto.Changeset{data: %Position{}}

  """
  def change_position(%Position{} = position, attrs \\ %{}) do
    Position.changeset(position, attrs)
  end

  alias Debats.Subjects.Claim

  @doc """
  Returns the list of claims.

  ## Examples

      iex> list_claims()
      [%Claim{}, ...]

  """
  def list_claims do
    Repo.all(Claim)
  end

  @doc """
  Gets a single claim.

  Raises `Ecto.NoResultsError` if the Claim does not exist.

  ## Examples

      iex> get_claim!(123)
      %Claim{}

      iex> get_claim!(456)
      ** (Ecto.NoResultsError)

  """
  def get_claim!(id), do: Repo.get!(Claim, id)

  @doc """
  Creates a claim.

  ## Examples

      iex> create_claim(%{field: value})
      {:ok, %Claim{}}

      iex> create_claim(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_claim(attrs \\ %{}) do
    %Claim{}
    |> Claim.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a claim.

  ## Examples

      iex> update_claim(claim, %{field: new_value})
      {:ok, %Claim{}}

      iex> update_claim(claim, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_claim(%Claim{} = claim, attrs) do
    claim
    |> Claim.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a claim.

  ## Examples

      iex> delete_claim(claim)
      {:ok, %Claim{}}

      iex> delete_claim(claim)
      {:error, %Ecto.Changeset{}}

  """
  def delete_claim(%Claim{} = claim) do
    Repo.delete(claim)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking claim changes.

  ## Examples

      iex> change_claim(claim)
      %Ecto.Changeset{data: %Claim{}}

  """
  def change_claim(%Claim{} = claim, attrs \\ %{}) do
    Claim.changeset(claim, attrs)
  end
end
