# frozen_string_literal: true

module Mutations
  class BaseMutation < GraphQL::Schema::RelayClassicMutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject

    private

    # The record a global ID names; `only:` keeps an ID of another model from loading it.
    def locate(id, only:)
      gid = GlobalID.parse(id)
      (gid && GlobalID::Locator.locate(gid, only: only)) || raise(GraphQL::ExecutionError, "#{only.model_name.human} not found.")
    end

    def authorize!(record, ability)
      return if Pundit.policy!(context[:current_user], record).public_send("#{ability}?")

      raise GraphQL::ExecutionError, "This action is unauthorized."
    end
  end
end
