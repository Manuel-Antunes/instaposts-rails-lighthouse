# One image or video of a post. `kind` comes from the file's content type.
class PostAsset < ApplicationRecord
  MAX_SIZE = 50.megabytes

  belongs_to :post
  has_one_attached :file, service: :media

  enum :kind, { image: 0, video: 1 }

  before_validation :set_kind

  validates :file, presence: true
  validate :file_is_an_image_or_a_video

  private

  def set_kind
    type = file.attached? ? file.content_type.to_s : ""
    self.kind = type.start_with?("video/") ? :video : :image
  end

  def file_is_an_image_or_a_video
    return unless file.attached?

    errors.add(:file, "must be an image or a video") unless file.content_type.to_s.start_with?("image/", "video/")
    errors.add(:file, "must be smaller than #{MAX_SIZE / 1.megabyte} MB") if file.byte_size > MAX_SIZE
  end
end
