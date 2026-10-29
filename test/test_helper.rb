ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

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

class ActionDispatch::IntegrationTest
  include InertiaTestHelper
end
