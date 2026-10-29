# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    field :send_webhook_event, mutation: Mutations::SendWebhookEvent
  end
end
