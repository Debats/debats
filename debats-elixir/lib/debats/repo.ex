defmodule Debats.Repo do
  use Ecto.Repo,
    otp_app: :debats,
    adapter: Ecto.Adapters.Postgres
end
