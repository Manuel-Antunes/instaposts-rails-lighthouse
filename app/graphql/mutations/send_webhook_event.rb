# frozen_string_literal: true

module Mutations
  class SendWebhookEvent < BaseMutation
    def resolve(event_name:, payload:)
      Rails.logger.info("Sending webhook event: #{event_name} with payload: #{payload}")
      # Here you would implement the logic to send the webhook event.
      { success: true, message: "Webhook event sent successfully." }
    end
  end
end
