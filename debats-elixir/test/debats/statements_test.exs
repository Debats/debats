defmodule Debats.StatementsTest do
  use Debats.DataCase

  alias Debats.Statements

  describe "statements" do
    alias Debats.Statements.Statement

    @valid_attrs %{
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

    def statement_fixture(attrs \\ %{}) do
      {:ok, statement} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Statements.create_statement()

      statement
    end

    test "list_statements/0 returns all statements" do
      statement = statement_fixture()
      assert Statements.list_statements() == [statement]
    end

    test "get_statement!/1 returns the statement with given id" do
      statement = statement_fixture()
      assert Statements.get_statement!(statement.id) == statement
    end

    test "create_statement/1 with valid data creates a statement" do
      assert {:ok, %Statement{} = statement} = Statements.create_statement(@valid_attrs)
      assert statement.date == ~D[2010-04-17]
      assert statement.evidence_source == "some evidence_source"
      assert statement.evidence_url == "some evidence_url"
      assert statement.quote == "some quote"
    end

    test "create_statement/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Statements.create_statement(@invalid_attrs)
    end

    test "update_statement/2 with valid data updates the statement" do
      statement = statement_fixture()

      assert {:ok, %Statement{} = statement} =
               Statements.update_statement(statement, @update_attrs)

      assert statement.date == ~D[2011-05-18]
      assert statement.evidence_source == "some updated evidence_source"
      assert statement.evidence_url == "some updated evidence_url"
      assert statement.quote == "some updated quote"
    end

    test "update_statement/2 with invalid data returns error changeset" do
      statement = statement_fixture()
      assert {:error, %Ecto.Changeset{}} = Statements.update_statement(statement, @invalid_attrs)
      assert statement == Statements.get_statement!(statement.id)
    end

    test "delete_statement/1 deletes the statement" do
      statement = statement_fixture()
      assert {:ok, %Statement{}} = Statements.delete_statement(statement)
      assert_raise Ecto.NoResultsError, fn -> Statements.get_statement!(statement.id) end
    end

    test "change_statement/1 returns a statement changeset" do
      statement = statement_fixture()
      assert %Ecto.Changeset{} = Statements.change_statement(statement)
    end
  end
end
