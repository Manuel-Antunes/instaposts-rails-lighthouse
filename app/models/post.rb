class Post < ApplicationRecord
  # Deleting a post puts it in the trash (discard!); admins restore it or delete it for
  # good. Trashed posts are hidden everywhere unless asked for: Post.with_discarded, and
  # in GraphQL the `trashed` argument Lighthouse's @softDeletes adds.
  include Discard::Model
  default_scope -> { kept }

  # Full-text search, through Lighthouse's @search: Query.posts(search:) ranks by the title
  # first, then the caption, in English and in Portuguese ("running" finds "runs", "corrida"
  # finds "correndo"), from the GIN index on search_vector (config/initializers/pg_search.rb).
  # Query.search finds posts among users and hashtags (multisearch), live ones only: a trashed
  # post leaves its document, and gets it back once restored.
  include PgSearch::Model
  pg_search_scope :search, against: { name: "A", content: "B" }, ignoring: :accents,
                           using: { tsearch: { tsvector_column: "search_vector", dictionaries: %w[simple english portuguese], prefix: true } }
  multisearchable against: %i[name content], if: :kept?,
                  update_if: ->(post) { post.saved_change_to_name? || post.saved_change_to_content? }

  belongs_to :author, class_name: "User", inverse_of: :posts
  has_many :likes, dependent: :delete_all
  has_many :comments, dependent: :delete_all
  # Destroyed one by one when the post is deleted for good, so their files are purged.
  has_many :assets, -> { order(:position) }, class_name: "PostAsset", inverse_of: :post, dependent: :destroy,
                    autosave: true, index_errors: true
  has_many :post_hashtags, dependent: :delete_all
  has_many :hashtags, through: :post_hashtags

  MAX_ASSETS = 10
  # Instagram's limit of hashtags in a caption.
  MAX_HASHTAGS = 30

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true
  validate :at_most_max_hashtags

  after_save :sync_hashtags, if: :saved_change_to_content?

  validates :assets, length: { maximum: MAX_ASSETS, message: "can be at most #{MAX_ASSETS}" }

  # What GraphQL's createPost hands over as `files`: the signed ids of the blobs @upload
  # stored, in the order they were sent. Each becomes a PostAsset.
  def files=(signed_ids)
    Array(signed_ids).each_with_index { |signed_id, position| assets.build(file: signed_id, position: position) }
  end

  # Tags the post with the #hashtags of its caption and of its author's own comments on it, as
  # Instagram does; the tags no longer written there are taken off. Run when the caption
  # changes, and by Comment when its author's comments do.
  def sync_hashtags
    names = Hashtag.names_in([ content, *comments.where(author_id: author_id).pluck(:body) ].join("\n"))
    self.hashtags = names.map { |name| Hashtag.create_or_find_by!(name: name) }
  end

  private

  def at_most_max_hashtags
    count = Hashtag.names_in(content).size
    errors.add(:content, "can have at most #{MAX_HASHTAGS} hashtags") if count > MAX_HASHTAGS
  end
end
