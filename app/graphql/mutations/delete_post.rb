# frozen_string_literal: true

module Mutations
  # Lighthouse's @delete destroys; a post goes to the trash instead (Discard).
  class DeletePost < BaseMutation
    def resolve(id:)
      post = locate(id, only: Post)
      authorize!(post, :destroy)

      post.discard!
      post
    end
  end
end
