defmodule DebatsWeb.StatementControllerTest do
  use DebatsWeb.ConnCase

  alias Debats.Statements

  @create_attrs %{
    date: ~D[2010-04-17],
    evidence_source: "some evidence_source",
    evidence_url: "some evidence_url",
    quote: "some quote"
  }
  @update_attrs %{
    date: ~D[2011-05-18],
    evidence_source: "some updated evidence_source",
    evidence_url: "some updated evidence_url",
    quote: "some updated quote"
  }
  @invalid_attrs %{date: nil, evidence_source: nil, evidence_url: nil, quote: nil}

  def fixture(:statement) do
    {:ok, statement} = Statements.create_statement(@create_attrs)
    statement
  end

  describe "index" do
    test "lists all statements", %{conn: conn} do
      conn = get(conn, Routes.statement_path(conn, :index))
      assert html_response(conn, 200) =~ "Listing Statements"
    end
  end

  describe "new statement" do
    test "renders form", %{conn: conn} do
      conn = get(conn, Routes.statement_path(conn, :new))
      assert html_response(conn, 200) =~ "New Statement"
    end
  end

  describe "create statement" do
    test "redirects to show when data is valid", %{conn: conn} do
      conn = post(conn, Routes.statement_path(conn, :create), statement: @create_attrs)

      assert %{id: id} = redirected_params(conn)
      assert redirected_to(conn) == Routes.statement_path(conn, :show, id)

      conn = get(conn, Routes.statement_path(conn, :show, id))
      assert html_response(conn, 200) =~ "Show Statement"
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, Routes.statement_path(conn, :create), statement: @invalid_attrs)
      assert html_response(conn, 200) =~ "New Statement"
    end
  end

  describe "edit statement" do
    setup [:create_statement]

    test "renders form for editing chosen statement", %{conn: conn, statement: statement} do
      conn = get(conn, Routes.statement_path(conn, :edit, statement))
      assert html_response(conn, 200) =~ "Edit Statement"
    end
  end

  describe "update statement" do
    setup [:create_statement]

    test "redirects when data is valid", %{conn: conn, statement: statement} do
      conn = put(conn, Routes.statement_path(conn, :update, statement), statement: @update_attrs)
      assert redirected_to(conn) == Routes.statement_path(conn, :show, statement)

      conn = get(conn, Routes.statement_path(conn, :show, statement))
      assert html_response(conn, 200) =~ "some updated evidence_source"
    end

    test "renders errors when data is invalid", %{conn: conn, statement: statement} do
      conn = put(conn, Routes.statement_path(conn, :update, statement), statement: @invalid_attrs)
      assert html_response(conn, 200) =~ "Edit Statement"
    end
  end

  describe "delete statement" do
    setup [:create_statement]

    test "deletes chosen statement", %{conn: conn, statement: statement} do
      conn = delete(conn, Routes.statement_path(conn, :delete, statement))
      assert redirected_to(conn) == Routes.statement_path(conn, :index)

      assert_error_sent 404, fn ->
        get(conn, Routes.statement_path(conn, :show, statement))
      end
    end
  end

  defp create_statement(_) do
    statement = fixture(:statement)
    %{statement: statement}
  end
end
