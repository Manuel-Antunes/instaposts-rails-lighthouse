ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# render_preloaded reads the pages' GraphQL operations from the Vite manifest, which
# vite_ruby's autoBuild builds when stale. Build it once here, before the workers fork.
if ViteRuby.config.auto_build && !ViteRuby.instance.dev_server_running?
  ViteRuby.instance.builder.build || abort("The Vite build for the tests failed")
  # The workers only read it: several building the same directory at once fail.
  ViteRuby.configure(auto_build: false)
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

  # What the provider answers for the next OmniAuth callback (OmniAuth's test mode,
  # whose middleware answers /auth/:provider/callback). Undone after each test.
  def mock_oauth(provider: "github", uid:, email:, name: "OAuth User")
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[provider.to_sym] = OmniAuth::AuthHash.new(provider: provider, uid: uid, info: { email: email, name: name })
  end

  # Signs in through the OmniAuth callback, as a browser would.
  def sign_in_as(user)
    account = user.accounts.first_or_create!(provider: "github", uid: "uid-#{user.id}")
    mock_oauth(uid: account.uid, email: user.email, name: user.name)
    get "/auth/github/callback"
  end
end

module GraphqlTestHelper
  # The global id a record of `model_name` with this id would have: another type's id with
  # the same number as a real record, which must not find it.
  def global_id(model_name, id) = GlobalID.new(URI::GID.build(app: GlobalID.app, model_name: model_name, model_id: id.to_s)).to_param

  # POST /graphql as the API clients do: a bearer JWT for `as`, none for a guest.
  def gql(query, as: nil, variables: {})
    headers = as ? { "Authorization" => "Bearer #{AuthToken.encode(as)}" } : {}
    post "/graphql", params: { query: query, variables: variables }, headers: headers, as: :json
    response.parsed_body
  end
end

module UploadTestHelper
  # POST /graphql as a multipart request (the GraphQL multipart request spec, which
  # Lighthouse reads): `files` maps a variable path ("files.0", "avatar") to a fixture.
  def gql_upload(query, as:, variables: {}, files: {})
    params = {
      operations: { query: query, variables: variables }.to_json,
      map: files.keys.each_with_index.to_h { |path, i| [ i.to_s, [ "variables.#{path}" ] ] }.to_json
    }
    files.values.each_with_index { |name, i| params[i.to_s] = fixture_file_upload(name) }
    post "/graphql", params: params, headers: { "Authorization" => "Bearer #{AuthToken.encode(as)}" }
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
  teardown do
    OmniAuth.config.test_mode = false
    OmniAuth.config.mock_auth.delete(:github)
  end

  include InertiaTestHelper
  include GraphqlTestHelper
  include MailTestHelper
  include UploadTestHelper
  include ActionMailer::TestHelper
end
