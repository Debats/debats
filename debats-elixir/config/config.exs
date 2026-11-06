# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :debats,
  ecto_repos: [Debats.Repo]

# Configures the endpoint
config :debats, DebatsWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "Q4fUmyjuwsD6HKYzgijm0S9Qtj6yaxWpa4aGPzTf7V38ROsBnj1sJWlwDDOx1sSO",
  render_errors: [view: DebatsWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: Debats.PubSub,
  live_view: [signing_salt: "I5zPGUFW"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
