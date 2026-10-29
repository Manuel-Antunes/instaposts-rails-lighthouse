# frozen_string_literal: true

module Types
  # Resolves the fields of the SDL's Post that no directive does.
  class PostType < BaseObject
    # The routes are Rails': the frontend links to what this says, never builds the URL.
    def path = Rails.application.routes.url_helpers.post_path(object)

    def viewer_has_liked
      user = context[:current_user]
      return false unless user

      dataloader.with(Sources::ViewerLikes, user).load(object.id)
    end
  end
end
