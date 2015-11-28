# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20151022105845) do

  create_table "evidences", force: :cascade do |t|
    t.integer  "statement_id"
    t.string   "title"
    t.string   "url"
    t.string   "file"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.datetime "fact_date"
  end

  add_index "evidences", ["statement_id"], name: "index_evidences_on_statement_id"

  create_table "friendly_id_slugs", force: :cascade do |t|
    t.string   "slug",                      null: false
    t.integer  "sluggable_id",              null: false
    t.string   "sluggable_type", limit: 50
    t.string   "scope"
    t.datetime "created_at"
  end

  add_index "friendly_id_slugs", ["slug", "sluggable_type", "scope"], name: "index_friendly_id_slugs_on_slug_and_sluggable_type_and_scope", unique: true
  add_index "friendly_id_slugs", ["slug", "sluggable_type"], name: "index_friendly_id_slugs_on_slug_and_sluggable_type"
  add_index "friendly_id_slugs", ["sluggable_id"], name: "index_friendly_id_slugs_on_sluggable_id"
  add_index "friendly_id_slugs", ["sluggable_type"], name: "index_friendly_id_slugs_on_sluggable_type"

  create_table "positions", force: :cascade do |t|
    t.string   "title"
    t.text     "description"
    t.integer  "subject_id"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
  end

  add_index "positions", ["subject_id"], name: "index_positions_on_subject_id"

  create_table "public_figures", force: :cascade do |t|
    t.string   "name"
    t.string   "presentation"
    t.string   "wikipedia_url"
    t.string   "website_url"
    t.datetime "created_at",    null: false
    t.datetime "updated_at",    null: false
    t.string   "picture"
    t.string   "slug"
  end

  add_index "public_figures", ["slug"], name: "index_public_figures_on_slug", unique: true

  create_table "statements", force: :cascade do |t|
    t.integer  "position_id"
    t.integer  "public_figure_id"
    t.datetime "created_at",       null: false
    t.datetime "updated_at",       null: false
  end

  add_index "statements", ["position_id", "public_figure_id"], name: "index_statements_on_position_id_and_public_figure_id", unique: true
  add_index "statements", ["position_id"], name: "index_statements_on_position_id"
  add_index "statements", ["public_figure_id"], name: "index_statements_on_public_figure_id"

  create_table "subjects", force: :cascade do |t|
    t.string   "title"
    t.string   "presentation"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.string   "picture"
    t.string   "problem"
    t.string   "slug"
  end

  add_index "subjects", ["slug"], name: "index_subjects_on_slug", unique: true

  create_table "users", force: :cascade do |t|
    t.string   "name"
    t.string   "email"
    t.datetime "created_at",                        null: false
    t.datetime "updated_at",                        null: false
    t.string   "password_digest"
    t.string   "remember_digest"
    t.integer  "reputation"
    t.string   "activation_digest"
    t.boolean  "activated",         default: false
    t.datetime "activated_at"
    t.string   "reset_digest"
    t.datetime "reset_sent_at"
  end

  add_index "users", ["email"], name: "index_users_on_email", unique: true

end
