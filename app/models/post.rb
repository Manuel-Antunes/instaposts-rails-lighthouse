class Post < ApplicationRecord
  # Deleting a post puts it in the trash (discard!); admins restore it or delete it for
  # good. Trashed posts are hidden everywhere unless asked for: Post.with_discarded, and
  # in GraphQL the `trashed` argument Lighthouse's @softDeletes adds.
  include Discard::Model
  default_scope -> { kept }

  belongs_to :author, class_name: "User", inverse_of: :posts
  has_many :likes, dependent: :delete_all
  has_many :comments, dependent: :delete_all
  # Destroyed one by one when the post is deleted for good, so their files are purged.
  has_many :assets, -> { order(:position) }, class_name: "PostAsset", inverse_of: :post, dependent: :destroy,
                    autosave: true, index_errors: true

  MAX_ASSETS = 10

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true

  validates :assets, length: { maximum: MAX_ASSETS, message: "can be at most #{MAX_ASSETS}" }

  # What GraphQL's createPost hands over as `files`: the signed ids of the blobs @upload
  # stored, in the order they were sent. Each becomes a PostAsset.
  def files=(signed_ids)
    Array(signed_ids).each_with_index { |signed_id, position| assets.build(file: signed_id, position: position) }
  end
end
