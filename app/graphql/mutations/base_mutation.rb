# frozen_string_literal: true

module Mutations
  class BaseMutation < GraphQL::Schema::RelayClassicMutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject

    private

    # The record a global ID names; `only:` keeps an ID of another model from loading it.
    # GlobalID's locator skips default scopes: a trashed (discarded) record is not found either.
    def locate(id, only:)
      gid = GlobalID.parse(id)
      record = gid && GlobalID::Locator.locate(gid, only: only)
      record = nil if record.respond_to?(:discarded?) && record.discarded?
      record || raise(GraphQL::ExecutionError, "#{only.model_name.human} not found.")
    end

    def authorize!(record, ability)
      return if Pundit.policy!(context[:current_user], record).public_send("#{ability}?")

      raise GraphQL::ExecutionError, "This action is unauthorized."
    end
  end
end
