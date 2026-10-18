{
  description = "Mon Entreprise";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs, nixpkgs-unstable }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          unstable = import nixpkgs-unstable { inherit system; };
        in
        {
          default = pkgs.mkShell {
            nativeBuildInputs = [
              pkgs.nodejs_22
              unstable.supabase-cli
              # Prisma's schema engine (db pull); the query engine is gone since Prisma 7.
              # Keep the npm prisma version equal to this package's version.
              unstable.prisma-engines_7
              # The prisma CLI probes `openssl` on the PATH and warns without it
              pkgs.openssl
              # Fetches video subtitles, to extract statements from a debate or
              # an interview (see the extract-positions-from-media skill)
              pkgs.yt-dlp
            ];

            shellHook = ''
              export NODE_ENV=development

              # Prisma cannot download its engine for NixOS: point the CLI at the Nix build.
              export PRISMA_SCHEMA_ENGINE_BINARY="${unstable.prisma-engines_7}/bin/schema-engine"

              # Force pure mode indication if your prompt is displaying impure
              export IN_NIX_SHELL=pure
            '';
          };
        });
    };
}
