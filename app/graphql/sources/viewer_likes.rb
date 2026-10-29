# frozen_string_literal: true

module Sources
  # Whether `user` likes each post, in one query for every post of a response.
  class ViewerLikes < GraphQL::Dataloader::Source
    def initialize(user)
      @user = user
    end

    def fetch(post_ids)
      liked = Like.where(user: @user, post_id: post_ids).pluck(:post_id).to_set
      post_ids.map { liked.include?(_1) }
    end
  end
end
