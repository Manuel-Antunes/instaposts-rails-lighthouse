# frozen_string_literal: true

module Mutations
  class LikePost < BaseMutation
    def resolve(id:)
      post = locate(id, only: Post)
      authorize!(post, :like)

      like(post)
      post.reload
    end

    private

    # A concurrent like of the same post loses on the unique index: the like is there either way.
    def like(post)
      post.likes.find_or_create_by!(user: context[:current_user])
    rescue ActiveRecord::RecordNotUnique
      nil
    end
  end
end
