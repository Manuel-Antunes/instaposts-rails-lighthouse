class Comment < ApplicationRecord
  # Instagram's limit for a caption or comment.
  MAX_LENGTH = 2200

  belongs_to :post, counter_cache: true
  belongs_to :author, class_name: "User", inverse_of: :comments

  normalizes :body, with: ->(body) { body.strip }

  validates :body, presence: true, length: { maximum: MAX_LENGTH }

  # The post's author's own comments tag the post too, as on Instagram: the #hashtags they
  # write there count as the caption's (Post#sync_hashtags).
  after_save :sync_post_hashtags, if: -> { by_post_author? && (previously_new_record? || saved_change_to_body?) }
  after_destroy :sync_post_hashtags, if: :by_post_author?

  private

  def by_post_author? = post.present? && author_id == post.author_id

  def sync_post_hashtags = post.sync_hashtags
end
