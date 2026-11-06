defmodule DebatsWeb.Router do
  use DebatsWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug Debats.Plugs.Auth
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", DebatsWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/mode-demploi", PageController, :how_to
    get "/a-propos", PageController, :about
    get "/contact", PageController, :contact
    get "/login", SessionController, :new
    post "/login", SessionController, :create
    delete "/login", SessionController, :delete
    resources "/s", SubjectController
    resources "/p", PublicFigureController
    resources "/po", PositionController
    resources "/st", StatementController
    resources "/u", UserController
    #    resources "/c", ClaimController
  end

  # Other scopes may use custom stacks.
  # scope "/api", DebatsWeb do
  #   pipe_through :api
  # end

  # Enables LiveDashboard only for development
  #
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).
  if Mix.env() in [:dev, :test] do
    import Phoenix.LiveDashboard.Router

    scope "/" do
      pipe_through :browser
      live_dashboard "/dashboard", metrics: DebatsWeb.Telemetry
    end
  end
end
