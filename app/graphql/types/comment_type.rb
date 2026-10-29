# frozen_string_literal: true

module Types
  # Resolves the fields of the SDL's Comment that no directive does.
  class CommentType < BaseObject
    def viewer_can_update = policy.update?

    def viewer_can_delete = policy.destroy?

    private

    def policy = CommentPolicy.new(context[:current_user], object)
  end
end
