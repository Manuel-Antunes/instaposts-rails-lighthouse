# A post tagged with a #hashtag. Post#sync_hashtags keeps them.
class PostHashtag < ApplicationRecord
  belongs_to :post
  belongs_to :hashtag
end
