# Search reads each table's `search_vector`, a stored tsvector with a GIN index
# (db/migrate/20261030180000_add_search_vectors.rb): nothing is computed per row, a word being
# typed matches its start ("ra" finds #rails), and the query drops its accents as the vectors
# do ("joao" finds João).

# pg_search reads a query with one text search configuration (`dictionary:`). Captions are in
# English or in Portuguese, and their vectors hold each word as written and as each language
# stems it: `dictionaries:` reads each word of the query with each configuration, any of them
# matching, so "running" finds "runs" and "corrida" finds "correndo". Only the configuration
# changes: the term is pg_search's own, sanitized, unaccented and prefixed (pg_search 2.4's
# TSearch#tsquery_for_term, pinned in the Gemfile; test/integration/search_test.rb covers it).
module PgSearchDictionaries
  def self.prepended(feature) = feature.singleton_class.prepend(ValidOptions)

  module ValidOptions
    def valid_options = super + %i[dictionaries]
  end

  private

  def tsquery_for_term(term)
    return super unless options[:dictionaries]

    queries = options[:dictionaries].map do |dictionary|
      query = super(term.dup)
      Arel::Nodes::NamedFunction.new("to_tsquery", [ Arel::Nodes.build_quoted(dictionary), query.expressions.last ])
    end
    Arel::Nodes::Grouping.new(queries.reduce { |any, query| Arel::Nodes::InfixOperation.new("||", any, query) })
  end
end
PgSearch::Features::TSearch.prepend(PgSearchDictionaries)

# The search box (Query.search: people, posts and hashtags together, Lighthouse's @search on a
# union) ranks the multisearch documents. The rank is divided by the document's length
# (normalization: 2), so a short match, a @username or a #hashtag, comes before a long caption
# that repeats the word, as in Instagram's search box.
PgSearch.multisearch_options = {
  using: { tsearch: { tsvector_column: "search_vector", dictionaries: %w[simple english portuguese], prefix: true, normalization: 2 } },
  ignoring: :accents
}

# The documents' vectors are the database's to read: the search box never loads them. (Not on
# Post, User or Hashtag: Lighthouse 0.9.1 batches nested lists, a profile's or a hashtag's posts,
# through a subquery whose owner column a model's ignored_columns drops from what loads.)
ActiveSupport.on_load(:active_record) { PgSearch::Document.ignored_columns += %w[search_vector] }
