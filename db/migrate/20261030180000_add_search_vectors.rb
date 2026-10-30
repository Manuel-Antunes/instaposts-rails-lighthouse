# Full-text search from an index. Each searched table gets `search_vector`, a stored generated
# tsvector with a GIN index, so a search reads the index instead of running to_tsvector() on
# every row. Posts (and the documents of the search box, which hold their captions) are in
# English or in Portuguese: their vector holds each word as written ("simple": names,
# @usernames, a word half typed), as English stems it and as Portuguese stems it, and the query
# reads each word with all three (pg_search's `dictionaries:`, config/initializers/pg_search.rb).
# People and hashtags are names: as written only.
class AddSearchVectors < ActiveRecord::Migration[8.1]
  # The accents of English and Portuguese. The query drops them with unaccent(), which is only
  # STABLE; a generated column takes IMMUTABLE functions only, and translate() is one.
  ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ"
  PLAIN = "aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN"
  LANGUAGES = %w[simple english portuguese].freeze

  def change
    add_search_vector :posts, { name: "A", content: "B" }, configs: LANGUAGES
    add_search_vector :pg_search_documents, { content: nil }, configs: LANGUAGES
    add_search_vector :users, { username: "A", name: "B" }, configs: %w[simple]
    add_search_vector :hashtags, { name: nil }, configs: %w[simple]
  end

  private

  def add_search_vector(table, columns, configs:)
    vectors = columns.flat_map { |column, weight| configs.map { |config| vector(config, column, weight) } }
    add_column table, :search_vector, :virtual, type: :tsvector, as: vectors.join(" || "), stored: true
    add_index table, :search_vector, using: :gin
  end

  # The column's words, composed (NFC: an accent typed apart is one letter) and without accents.
  def vector(config, column, weight)
    text = "translate(normalize(coalesce(#{column}, ''), NFC), '#{ACCENTED}', '#{PLAIN}')"
    tsvector = "to_tsvector('#{config}'::regconfig, #{text})"
    weight ? "setweight(#{tsvector}, '#{weight}')" : tsvector
  end
end
