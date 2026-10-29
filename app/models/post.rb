class Post < ApplicationRecord
  include Activatable

  belongs_to :author, class_name: "User", inverse_of: :posts

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true
end
