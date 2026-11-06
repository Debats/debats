defmodule DebatsWeb.PublicFigureController do
  use DebatsWeb, :controller

  alias Debats.Actors
  alias Debats.Actors.PublicFigure

  def index(conn, _params) do
    public_figures = Actors.list_public_figures()
    render(conn, "index.html", public_figures: public_figures)
  end

  def new(conn, _params) do
    changeset = Actors.change_public_figure(%PublicFigure{})
    render(conn, "new.html", changeset: changeset)
  end

  def create(conn, %{"public_figure" => public_figure_params}) do
    case Actors.create_public_figure(public_figure_params) do
      {:ok, public_figure} ->
        conn
        |> put_flash(:info, "Public figure created successfully.")
        |> redirect(to: Routes.public_figure_path(conn, :show, public_figure))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    public_figure = Actors.get_public_figure!(id)
    render(conn, "show.html", public_figure: public_figure)
  end

  def edit(conn, %{"id" => id}) do
    public_figure = Actors.get_public_figure!(id)
    changeset = Actors.change_public_figure(public_figure)
    render(conn, "edit.html", public_figure: public_figure, changeset: changeset)
  end

  def update(conn, %{"id" => id, "public_figure" => public_figure_params}) do
    public_figure = Actors.get_public_figure!(id)

    case Actors.update_public_figure(public_figure, public_figure_params) do
      {:ok, public_figure} ->
        conn
        |> put_flash(:info, "Public figure updated successfully.")
        |> redirect(to: Routes.public_figure_path(conn, :show, public_figure))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", public_figure: public_figure, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    public_figure = Actors.get_public_figure!(id)
    {:ok, _public_figure} = Actors.delete_public_figure(public_figure)

    conn
    |> put_flash(:info, "Public figure deleted successfully.")
    |> redirect(to: Routes.public_figure_path(conn, :index))
  end
end
