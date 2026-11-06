defmodule DebatsWeb.PositionController do
  use DebatsWeb, :controller

  alias Debats.Subjects
  alias Debats.Subjects.Position

  def index(conn, _params) do
    positions = Subjects.list_positions()
    render(conn, "index.html", positions: positions)
  end

  def new(conn, _params) do
    changeset = Subjects.change_position(%Position{})
    render(conn, "new.html", changeset: changeset)
  end

  def create(conn, %{"position" => position_params}) do
    case Subjects.create_position(position_params) do
      {:ok, position} ->
        conn
        |> put_flash(:info, "Position created successfully.")
        |> redirect(to: Routes.position_path(conn, :show, position))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    position = Subjects.get_position!(id)
    render(conn, "show.html", position: position)
  end

  def edit(conn, %{"id" => id}) do
    position = Subjects.get_position!(id)
    changeset = Subjects.change_position(position)
    render(conn, "edit.html", position: position, changeset: changeset)
  end

  def update(conn, %{"id" => id, "position" => position_params}) do
    position = Subjects.get_position!(id)

    case Subjects.update_position(position, position_params) do
      {:ok, position} ->
        conn
        |> put_flash(:info, "Position updated successfully.")
        |> redirect(to: Routes.position_path(conn, :show, position))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", position: position, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    position = Subjects.get_position!(id)
    {:ok, _position} = Subjects.delete_position(position)

    conn
    |> put_flash(:info, "Position deleted successfully.")
    |> redirect(to: Routes.position_path(conn, :index))
  end
end
