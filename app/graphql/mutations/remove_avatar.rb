# frozen_string_literal: true

module Mutations
  # Back to the provider's picture, or the initials: the attachment goes now, the file
  # on the bucket in a job.
  class RemoveAvatar < BaseMutation
    def resolve
      user = context[:current_user]
      user.avatar.purge_later if user.avatar.attached?
      user.reload
    end
  end
end
