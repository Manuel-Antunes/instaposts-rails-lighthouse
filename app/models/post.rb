class Post < ApplicationRecord
  # Deleting a post puts it in the trash (discard!); admins restore it or delete it for
  # good. Trashed posts are hidden everywhere unless asked for: Post.with_discarded, and
  # in GraphQL the `trashed` argument Lighthouse's @softDeletes adds.
  include Discard::Model
  default_scope -> { kept }

  belongs_to :author, class_name: "User", inverse_of: :posts
  has_many :likes, dependent: :delete_all
  has_many :comments, dependent: :delete_all

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true
end
