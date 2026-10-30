# A #hashtag, as Instagram's: lowercase, without the #. A post is tagged with the ones of its
# caption and of its author's own comments on it (Post#sync_hashtags), and its tag's page lists
# it (/explore/tags/:name).
class Hashtag < ApplicationRecord
  include PgSearch::Model

  # A # then letters, digits and underscores, with a letter among them: #rails8 and #café are
  # tags (its é typed as one character or as e and an accent, \p{M}); #2026, the # of "C#"
  # and a URL's #anchor are not. The frontend highlights them with the same rule
  # (app/javascript/lib/rich-text.ts).
  PATTERN = /(?<![\p{L}\p{M}\p{N}_&#\/])#([\p{L}\p{M}\p{N}_]*\p{L}[\p{L}\p{M}\p{N}_]*)/
  MAX_LENGTH = 100

  has_many :post_hashtags, dependent: :delete_all
  has_many :posts, through: :post_hashtags

  normalizes :name, with: ->(name) { name.strip.delete_prefix("#").unicode_normalize(:nfc).downcase }

  # Unique by the database's index, which create_or_find_by! relies on (a uniqueness
  # validation would refuse the existing tag before the insert could find it).
  validates :name, presence: true, length: { maximum: MAX_LENGTH },
                   format: { with: /\A[\p{L}\p{M}\p{N}_]*\p{L}[\p{L}\p{M}\p{N}_]*\z/, allow_blank: true }

  # What a search may answer (Lighthouse's @search, alone or in Query.search): tags of a live
  # post. One whose posts all went to the trash is found again once a post has it.
  scope :search_results, -> { where(id: PostHashtag.where(post_id: Post.select(:id)).select(:hashtag_id)) }

  # The tags of the most live posts first: what breaks the ties of a search's rank, as one
  # prefix ("#rai") ranks #rails and #railway alike.
  scope :popular, -> {
    count = PostHashtag.where(post_id: Post.select(:id)).where(PostHashtag.arel_table[:hashtag_id].eq(arel_table[:id]))
    order(Arel.sql("(#{count.select(Arel.star.count).to_sql}) DESC"))
  }

  # As written, from the GIN index on search_vector: #viagens is not #viagem.
  pg_search_scope :search, against: :name, ignoring: :accents,
                           using: { tsearch: { tsvector_column: "search_vector", dictionary: "simple", prefix: true } }
  multisearchable against: :name

  # The tags written in `text`, as stored: lowercase, each once, in the order they come.
  def self.names_in(text)
    text.to_s.scan(PATTERN).flatten.map { _1.unicode_normalize(:nfc).downcase }.uniq.select { _1.length <= MAX_LENGTH }
  end
end
