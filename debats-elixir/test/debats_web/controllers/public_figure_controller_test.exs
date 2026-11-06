defmodule DebatsWeb.PublicFigureControllerTest do
  use DebatsWeb.ConnCase

  alias Debats.Actors

  @create_attrs %{intro: "some intro", name: "some name", wikipediaUrl: "some wikipediaUrl"}
  @update_attrs %{
    intro: "some updated intro",
    name: "some updated name",
    wikipediaUrl: "some updated wikipediaUrl"
  }
  @invalid_attrs %{intro: nil, name: nil, wikipediaUrl: nil}

  def fixture(:public_figure) do
    {:ok, public_figure} = Actors.create_public_figure(@create_attrs)
    public_figure
  end

  describe "index" do
    test "lists all public_figures", %{conn: conn} do
      conn = get(conn, Routes.public_figure_path(conn, :index))
      assert html_response(conn, 200) =~ "Listing Public figures"
    end
  end

  describe "new public_figure" do
    test "renders form", %{conn: conn} do
      conn = get(conn, Routes.public_figure_path(conn, :new))
      assert html_response(conn, 200) =~ "New Public figure"
    end
  end

  describe "create public_figure" do
    test "redirects to show when data is valid", %{conn: conn} do
      conn = post(conn, Routes.public_figure_path(conn, :create), public_figure: @create_attrs)

      assert %{id: id} = redirected_params(conn)
      assert redirected_to(conn) == Routes.public_figure_path(conn, :show, id)

      conn = get(conn, Routes.public_figure_path(conn, :show, id))
      assert html_response(conn, 200) =~ "Show Public figure"
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, Routes.public_figure_path(conn, :create), public_figure: @invalid_attrs)
      assert html_response(conn, 200) =~ "New Public figure"
    end
  end

  describe "edit public_figure" do
    setup [:create_public_figure]

    test "renders form for editing chosen public_figure", %{
      conn: conn,
      public_figure: public_figure
    } do
      conn = get(conn, Routes.public_figure_path(conn, :edit, public_figure))
      assert html_response(conn, 200) =~ "Edit Public figure"
    end
  end

  describe "update public_figure" do
    setup [:create_public_figure]

    test "redirects when data is valid", %{conn: conn, public_figure: public_figure} do
      conn =
        put(conn, Routes.public_figure_path(conn, :update, public_figure),
          public_figure: @update_attrs
        )

      assert redirected_to(conn) == Routes.public_figure_path(conn, :show, public_figure)

      conn = get(conn, Routes.public_figure_path(conn, :show, public_figure))
      assert html_response(conn, 200) =~ "some updated intro"
    end

    test "renders errors when data is invalid", %{conn: conn, public_figure: public_figure} do
      conn =
        put(conn, Routes.public_figure_path(conn, :update, public_figure),
          public_figure: @invalid_attrs
        )

      assert html_response(conn, 200) =~ "Edit Public figure"
    end
  end

  describe "delete public_figure" do
    setup [:create_public_figure]

    test "deletes chosen public_figure", %{conn: conn, public_figure: public_figure} do
      conn = delete(conn, Routes.public_figure_path(conn, :delete, public_figure))
      assert redirected_to(conn) == Routes.public_figure_path(conn, :index)

      assert_error_sent 404, fn ->
        get(conn, Routes.public_figure_path(conn, :show, public_figure))
      end
    end
  end

  defp create_public_figure(_) do
    public_figure = fixture(:public_figure)
    %{public_figure: public_figure}
  end
end
