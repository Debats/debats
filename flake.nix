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
            ];

            shellHook = ''
              export NODE_ENV=development

              # Force pure mode indication if your prompt is displaying impure
              export IN_NIX_SHELL=pure
            '';
          };
        });
    };
}
