# frozen_string_literal: true

module Mutations
  class UpdateUserRole < BaseMutation
    def resolve(id:, role:)
      user = locate_user(id) || raise(GraphQL::ExecutionError, "User not found.")
      raise GraphQL::ExecutionError, "This action is unauthorized." unless Pundit.policy!(context[:current_user], user).update_role?

      user.update!(role: role)
      user
    end

    private

    # `only:` keeps a global ID of another model from loading that record.
    def locate_user(id)
      gid = GlobalID.parse(id)
      gid && GlobalID::Locator.locate(gid, only: User)
    end
  end
end
