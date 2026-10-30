# frozen_string_literal: true

module Types
  # The file of a post's image or video; its url is @attachment's. The blobs are loaded
  # with the assets (@lazyLoad on Post.assets).
  class PostAssetType < BaseObject
    def content_type = object.file.content_type
  end
end
