class Post < ApplicationRecord
  include Activatable

  belongs_to :author, class_name: "User", inverse_of: :posts
  has_many :likes, dependent: :delete_all
  has_many :comments, dependent: :delete_all

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true
end
