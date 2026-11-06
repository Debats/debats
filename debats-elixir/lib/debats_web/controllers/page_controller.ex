defmodule DebatsWeb.PageController do
  use DebatsWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def how_to(conn, _param) do
    render(conn, "how_to.html")
  end

  def about(conn, _param) do
    render(conn, "about.html")
  end

  def contact(conn, _param) do
    render(conn, "contact.html")
  end
end
