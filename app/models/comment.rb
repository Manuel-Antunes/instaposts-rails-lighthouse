class Comment < ApplicationRecord
  # Instagram's limit for a caption or comment.
  MAX_LENGTH = 2200

  belongs_to :post, counter_cache: true
  belongs_to :author, class_name: "User", inverse_of: :comments

  normalizes :body, with: ->(body) { body.strip }

  validates :body, presence: true, length: { maximum: MAX_LENGTH }
end
