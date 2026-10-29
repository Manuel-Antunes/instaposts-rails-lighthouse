ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# render_preloaded reads the pages' GraphQL operations from the Vite manifest, which
# vite_ruby's autoBuild builds when stale. Build it once here, before the workers fork.
if ViteRuby.config.auto_build && !ViteRuby.instance.dev_server_running?
  ViteRuby.instance.builder.build || abort("The Vite build for the tests failed")
end

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

module InertiaTestHelper
  # Visits as the Inertia client does (JSON, no layout), so no Vite build is needed.
  def inertia_visit(method, path, **options)
    headers = { "X-Inertia" => "true", "X-Inertia-Version" => InertiaRails.configuration.version.to_s }
    send(method, path, headers: headers.merge(options.delete(:headers) || {}), **options)
  end

  def inertia_page = response.parsed_body

  # Signs in through the OmniAuth callback, as a browser would.
  def sign_in_as(user)
    account = user.accounts.first_or_create!(provider: "github", uid: "uid-#{user.id}")
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:github] = OmniAuth::AuthHash.new(
      provider: account.provider, uid: account.uid, info: { email: user.email, name: user.name }
    )
    Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:github]
    get "/auth/github/callback"
  ensure
    OmniAuth.config.test_mode = false
    Rails.application.env_config.delete("omniauth.auth")
  end
end

module GraphqlTestHelper
  # POST /graphql as the API clients do: a bearer JWT for `as`, none for a guest.
  def gql(query, as: nil, variables: {})
    headers = as ? { "Authorization" => "Bearer #{AuthToken.encode(as)}" } : {}
    post "/graphql", params: { query: query, variables: variables }, headers: headers, as: :json
    response.parsed_body
  end
end

module MailTestHelper
  # The path of the first link to this app in the last email sent.
  def link_in_last_email
    ActionMailer::Base.deliveries.last.text_part.body.to_s[%r{http://example\.com(/\S+)}, 1]
  end
end

class ActionDispatch::IntegrationTest
  include InertiaTestHelper
  include GraphqlTestHelper
  include MailTestHelper
  include ActionMailer::TestHelper
end
