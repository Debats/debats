defmodule DebatsWeb.SessionController do
  use DebatsWeb, :controller

  def new(conn, _) do
    render(conn, "login.html")
  end

  def create(
        conn,
        %{"session" => %{"email" => email, "password" => password}}
      ) do
    case Debats.Accounts.authenticate_by_email_and_password(email, password) do
      {:ok, user} ->
        conn
        |> Debats.Plugs.Auth.login(user)
        |> put_flash(:info, "Heureux de vous revoir !")
        |> redirect(to: Routes.page_path(conn, :index))

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Mauvaise combinaison email / mot de passe")
        |> render("login.html")
    end
  end

  def delete(conn, _) do
    conn
    |> Debats.Plugs.Auth.logout()
    |> redirect(to: Routes.page_path(conn, :index))
  end
end
