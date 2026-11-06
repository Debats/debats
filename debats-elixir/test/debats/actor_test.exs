defmodule Debats.ActorsTest do
  use Debats.DataCase

  alias Debats.Actors

  describe "public_figures" do
    alias Debats.Actors.PublicFigure

    @valid_attrs %{intro: "some intro", name: "some name", wikipediaUrl: "some wikipediaUrl"}
    @update_attrs %{
      intro: "some updated intro",
      name: "some updated name",
      wikipediaUrl: "some updated wikipediaUrl"
    }
    @invalid_attrs %{intro: nil, name: nil, wikipediaUrl: nil}

    def public_figure_fixture(attrs \\ %{}) do
      {:ok, public_figure} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Actors.create_public_figure()

      public_figure
    end

    test "list_public_figures/0 returns all public_figures" do
      public_figure = public_figure_fixture()
      assert Actors.list_public_figures() == [public_figure]
    end

    test "get_public_figure!/1 returns the public_figure with given id" do
      public_figure = public_figure_fixture()
      assert Actors.get_public_figure!(public_figure.id) == public_figure
    end

    test "create_public_figure/1 with valid data creates a public_figure" do
      assert {:ok, %PublicFigure{} = public_figure} = Actors.create_public_figure(@valid_attrs)
      assert public_figure.intro == "some intro"
      assert public_figure.name == "some name"
      assert public_figure.wikipediaUrl == "some wikipediaUrl"
    end

    test "create_public_figure/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Actors.create_public_figure(@invalid_attrs)
    end

    test "update_public_figure/2 with valid data updates the public_figure" do
      public_figure = public_figure_fixture()

      assert {:ok, %PublicFigure{} = public_figure} =
               Actors.update_public_figure(public_figure, @update_attrs)

      assert public_figure.intro == "some updated intro"
      assert public_figure.name == "some updated name"
      assert public_figure.wikipediaUrl == "some updated wikipediaUrl"
    end

    test "update_public_figure/2 with invalid data returns error changeset" do
      public_figure = public_figure_fixture()

      assert {:error, %Ecto.Changeset{}} =
               Actors.update_public_figure(public_figure, @invalid_attrs)

      assert public_figure == Actors.get_public_figure!(public_figure.id)
    end

    test "delete_public_figure/1 deletes the public_figure" do
      public_figure = public_figure_fixture()
      assert {:ok, %PublicFigure{}} = Actors.delete_public_figure(public_figure)
      assert_raise Ecto.NoResultsError, fn -> Actors.get_public_figure!(public_figure.id) end
    end

    test "change_public_figure/1 returns a public_figure changeset" do
      public_figure = public_figure_fixture()
      assert %Ecto.Changeset{} = Actors.change_public_figure(public_figure)
    end
  end
end
