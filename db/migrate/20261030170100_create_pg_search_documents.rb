# pg_search: `unaccent`, so "sao paulo" finds "São Paulo" (ignoring: :accents), and the
# documents of multisearch (pg_search_documents), one per user, live post and hashtag, which
# Query.search, a field of the SearchResult union, searches together, ranked in one list.
class CreatePgSearchDocuments < ActiveRecord::Migration[8.1]
  def change
    enable_extension "unaccent"

    create_table :pg_search_documents do |t|
      t.text :content
      t.belongs_to :searchable, polymorphic: true, index: true
      t.timestamps null: false
    end
  end
end
