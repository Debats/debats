defmodule Debats.SubjectsTest do
  use Debats.DataCase

  alias Debats.Subjects

  describe "subjects" do
    alias Debats.Subjects.Subject

    @valid_attrs %{description: "some description", title: "some title"}
    @update_attrs %{description: "some updated description", title: "some updated title"}
    @invalid_attrs %{description: nil, title: nil}

    def subject_fixture(attrs \\ %{}) do
      {:ok, subject} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Subjects.create_subject()

      subject
    end

    test "list_subjects/0 returns all subjects" do
      subject = subject_fixture()
      assert Subjects.list_subjects() == [subject]
    end

    test "get_subject!/1 returns the subject with given id" do
      subject = subject_fixture()
      assert Subjects.get_subject!(subject.id) == subject
    end

    test "create_subject/1 with valid data creates a subject" do
      assert {:ok, %Subject{} = subject} = Subjects.create_subject(@valid_attrs)
      assert subject.description == "some description"
      assert subject.title == "some title"
    end

    test "create_subject/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Subjects.create_subject(@invalid_attrs)
    end

    test "update_subject/2 with valid data updates the subject" do
      subject = subject_fixture()
      assert {:ok, %Subject{} = subject} = Subjects.update_subject(subject, @update_attrs)
      assert subject.description == "some updated description"
      assert subject.title == "some updated title"
    end

    test "update_subject/2 with invalid data returns error changeset" do
      subject = subject_fixture()
      assert {:error, %Ecto.Changeset{}} = Subjects.update_subject(subject, @invalid_attrs)
      assert subject == Subjects.get_subject!(subject.id)
    end

    test "delete_subject/1 deletes the subject" do
      subject = subject_fixture()
      assert {:ok, %Subject{}} = Subjects.delete_subject(subject)
      assert_raise Ecto.NoResultsError, fn -> Subjects.get_subject!(subject.id) end
    end

    test "change_subject/1 returns a subject changeset" do
      subject = subject_fixture()
      assert %Ecto.Changeset{} = Subjects.change_subject(subject)
    end
  end

  describe "subjectts" do
    alias Debats.Subjects.Subjectt

    @valid_attrs %{description: "some description", title: "some title"}
    @update_attrs %{description: "some updated description", title: "some updated title"}
    @invalid_attrs %{description: nil, title: nil}

    def subjectt_fixture(attrs \\ %{}) do
      {:ok, subjectt} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Subjects.create_subjectt()

      subjectt
    end

    test "list_subjectts/0 returns all subjectts" do
      subjectt = subjectt_fixture()
      assert Subjects.list_subjectts() == [subjectt]
    end

    test "get_subjectt!/1 returns the subjectt with given id" do
      subjectt = subjectt_fixture()
      assert Subjects.get_subjectt!(subjectt.id) == subjectt
    end

    test "create_subjectt/1 with valid data creates a subjectt" do
      assert {:ok, %Subjectt{} = subjectt} = Subjects.create_subjectt(@valid_attrs)
      assert subjectt.description == "some description"
      assert subjectt.title == "some title"
    end

    test "create_subjectt/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Subjects.create_subjectt(@invalid_attrs)
    end

    test "update_subjectt/2 with valid data updates the subjectt" do
      subjectt = subjectt_fixture()
      assert {:ok, %Subjectt{} = subjectt} = Subjects.update_subjectt(subjectt, @update_attrs)
      assert subjectt.description == "some updated description"
      assert subjectt.title == "some updated title"
    end

    test "update_subjectt/2 with invalid data returns error changeset" do
      subjectt = subjectt_fixture()
      assert {:error, %Ecto.Changeset{}} = Subjects.update_subjectt(subjectt, @invalid_attrs)
      assert subjectt == Subjects.get_subjectt!(subjectt.id)
    end

    test "delete_subjectt/1 deletes the subjectt" do
      subjectt = subjectt_fixture()
      assert {:ok, %Subjectt{}} = Subjects.delete_subjectt(subjectt)
      assert_raise Ecto.NoResultsError, fn -> Subjects.get_subjectt!(subjectt.id) end
    end

    test "change_subjectt/1 returns a subjectt changeset" do
      subjectt = subjectt_fixture()
      assert %Ecto.Changeset{} = Subjects.change_subjectt(subjectt)
    end
  end

  describe "positions" do
    alias Debats.Subjects.Position

    @valid_attrs %{description: "some description", title: "some title"}
    @update_attrs %{description: "some updated description", title: "some updated title"}
    @invalid_attrs %{description: nil, title: nil}

    def position_fixture(attrs \\ %{}) do
      {:ok, position} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Subjects.create_position()

      position
    end

    test "list_positions/0 returns all positions" do
      position = position_fixture()
      assert Subjects.list_positions() == [position]
    end

    test "get_position!/1 returns the position with given id" do
      position = position_fixture()
      assert Subjects.get_position!(position.id) == position
    end

    test "create_position/1 with valid data creates a position" do
      assert {:ok, %Position{} = position} = Subjects.create_position(@valid_attrs)
      assert position.description == "some description"
      assert position.title == "some title"
    end

    test "create_position/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Subjects.create_position(@invalid_attrs)
    end

    test "update_position/2 with valid data updates the position" do
      position = position_fixture()
      assert {:ok, %Position{} = position} = Subjects.update_position(position, @update_attrs)
      assert position.description == "some updated description"
      assert position.title == "some updated title"
    end

    test "update_position/2 with invalid data returns error changeset" do
      position = position_fixture()
      assert {:error, %Ecto.Changeset{}} = Subjects.update_position(position, @invalid_attrs)
      assert position == Subjects.get_position!(position.id)
    end

    test "delete_position/1 deletes the position" do
      position = position_fixture()
      assert {:ok, %Position{}} = Subjects.delete_position(position)
      assert_raise Ecto.NoResultsError, fn -> Subjects.get_position!(position.id) end
    end

    test "change_position/1 returns a position changeset" do
      position = position_fixture()
      assert %Ecto.Changeset{} = Subjects.change_position(position)
    end
  end

  describe "claims" do
    alias Debats.Subjects.Claim

    @valid_attrs %{description: "some description", title: "some title"}
    @update_attrs %{description: "some updated description", title: "some updated title"}
    @invalid_attrs %{description: nil, title: nil}

    def claim_fixture(attrs \\ %{}) do
      {:ok, claim} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Subjects.create_claim()

      claim
    end

    test "list_claims/0 returns all claims" do
      claim = claim_fixture()
      assert Subjects.list_claims() == [claim]
    end

    test "get_claim!/1 returns the claim with given id" do
      claim = claim_fixture()
      assert Subjects.get_claim!(claim.id) == claim
    end

    test "create_claim/1 with valid data creates a claim" do
      assert {:ok, %Claim{} = claim} = Subjects.create_claim(@valid_attrs)
      assert claim.description == "some description"
      assert claim.title == "some title"
    end

    test "create_claim/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Subjects.create_claim(@invalid_attrs)
    end

    test "update_claim/2 with valid data updates the claim" do
      claim = claim_fixture()
      assert {:ok, %Claim{} = claim} = Subjects.update_claim(claim, @update_attrs)
      assert claim.description == "some updated description"
      assert claim.title == "some updated title"
    end

    test "update_claim/2 with invalid data returns error changeset" do
      claim = claim_fixture()
      assert {:error, %Ecto.Changeset{}} = Subjects.update_claim(claim, @invalid_attrs)
      assert claim == Subjects.get_claim!(claim.id)
    end

    test "delete_claim/1 deletes the claim" do
      claim = claim_fixture()
      assert {:ok, %Claim{}} = Subjects.delete_claim(claim)
      assert_raise Ecto.NoResultsError, fn -> Subjects.get_claim!(claim.id) end
    end

    test "change_claim/1 returns a claim changeset" do
      claim = claim_fixture()
      assert %Ecto.Changeset{} = Subjects.change_claim(claim)
    end
  end
end
