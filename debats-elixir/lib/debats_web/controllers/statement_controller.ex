defmodule DebatsWeb.StatementController do
  use DebatsWeb, :controller

  alias Debats.Statements
  alias Debats.Statements.Statement

  def index(conn, _params) do
    statements = Statements.list_statements()
    render(conn, "index.html", statements: statements)
  end

  def new(conn, _params) do
    changeset = Statements.change_statement(%Statement{})
    render(conn, "new.html", changeset: changeset)
  end

  def create(conn, %{"statement" => statement_params}) do
    case Statements.create_statement(statement_params) do
      {:ok, statement} ->
        conn
        |> put_flash(:info, "Statement created successfully.")
        |> redirect(to: Routes.statement_path(conn, :show, statement))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    statement = Statements.get_statement!(id)
    render(conn, "show.html", statement: statement)
  end

  def edit(conn, %{"id" => id}) do
    statement = Statements.get_statement!(id)
    changeset = Statements.change_statement(statement)
    render(conn, "edit.html", statement: statement, changeset: changeset)
  end

  def update(conn, %{"id" => id, "statement" => statement_params}) do
    statement = Statements.get_statement!(id)

    case Statements.update_statement(statement, statement_params) do
      {:ok, statement} ->
        conn
        |> put_flash(:info, "Statement updated successfully.")
        |> redirect(to: Routes.statement_path(conn, :show, statement))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", statement: statement, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    statement = Statements.get_statement!(id)
    {:ok, _statement} = Statements.delete_statement(statement)

    conn
    |> put_flash(:info, "Statement deleted successfully.")
    |> redirect(to: Routes.statement_path(conn, :index))
  end
end
