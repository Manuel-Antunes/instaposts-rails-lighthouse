# frozen_string_literal: true

module Mutations
  class UnlikePost < BaseMutation
    def resolve(id:)
      post = locate(id, only: Post)
      authorize!(post, :like)

      Like.find_by(user: context[:current_user], post: post)&.destroy!
      post.reload
    end
  end
end
