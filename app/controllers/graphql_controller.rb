# frozen_string_literal: true

# Serves the schema: StartRequest/EndRequest events, persisted queries, batching,
# variables, Cache-Control. See docs/getting-started.md.
class GraphqlController < ApplicationController
  # Authentication is checked per request in #current_user: a bearer JWT, or the
  # browser session with a valid CSRF token.
  skip_forgery_protection

  include Lighthouse::GraphQL::Controller

  lighthouse_schema InstaPostsSchema

  private

  # A `Authorization: Bearer <jwt>` header is the only credential when present
  # (an invalid token never falls back to the session). Without one, the browser
  # session counts, but only for a request that passes Rails' CSRF check: the
  # frontend sends the token in X-CSRF-Token / X-XSRF-TOKEN.
  def current_user
    return @current_user if defined?(@current_user)

    @current_user =
      if request.authorization.present?
        token = request.authorization.to_s[/\ABearer (.+)\z/, 1]
        token && AuthToken.user_for(token)
      elsif verified_request?
        super
      end
  end

  # Read by @guard and the @can* directives — see config/initializers/lighthouse.rb.
  def graphql_context = { current_user: current_user }
end
