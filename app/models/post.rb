class Post < ApplicationRecord
  include Activatable

  validates :name, presence: true, length: { maximum: 255 }
  validates :content, presence: true
end
