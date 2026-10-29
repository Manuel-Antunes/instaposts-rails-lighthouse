require "test_helper"

class OmniauthTest < ActionDispatch::IntegrationTest
  setup do
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:github] = OmniAuth::AuthHash.new(
      provider: "github", uid: "99", info: { email: "oauth@example.com", name: "OAuth User" }
    )
    Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:github]
  end

  teardown do
    OmniAuth.config.test_mode = false
    Rails.application.env_config.delete("omniauth.auth")
  end

  test "the callback creates the user and starts a browser session" do
    assert_difference "User.count", 1 do
      get "/auth/github/callback"
    end
    assert_redirected_to root_path

    inertia_visit :get, "/"
    assert_equal "oauth@example.com", inertia_page.dig("props", "auth", "user", "email")
    assert_equal "Signed in as OAuth User.", inertia_page.dig("flash", "notice")
  end

  test "with FRONTEND_AUTH_CALLBACK_URL the callback also hands a JWT that resolves me" do
    ENV["FRONTEND_AUTH_CALLBACK_URL"] = "https://app.example.com/callback"
    get "/auth/github/callback"

    assert_match %r{\Ahttps://app\.example\.com/callback#token=}, response.location
    token = Rack::Utils.parse_query(URI(response.location).fragment).fetch("token")

    post "/graphql", params: { query: "{ me { name email } }" }, headers: { "Authorization" => "Bearer #{token}" }, as: :json
    assert_equal({ "name" => "OAuth User", "email" => "oauth@example.com" }, response.parsed_body.dig("data", "me"))
  ensure
    ENV.delete("FRONTEND_AUTH_CALLBACK_URL")
  end

  test "the browser session authenticates /graphql only with a valid CSRF token" do
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    get "/auth/github/callback"
    query = { query: "{ me { name } }" }

    post "/graphql", params: query, as: :json
    assert_nil response.parsed_body.dig("data", "me")

    post "/graphql", params: query, headers: { "X-CSRF-Token" => "forged" }, as: :json
    assert_nil response.parsed_body.dig("data", "me")

    inertia_visit :get, "/"
    token = CGI.unescape(cookies["XSRF-TOKEN"])
    post "/graphql", params: query, headers: { "X-XSRF-TOKEN" => token }, as: :json
    assert_equal "OAuth User", response.parsed_body.dig("data", "me", "name")

    # An invalid bearer token never falls back to the session.
    post "/graphql", params: query, headers: { "X-XSRF-TOKEN" => token, "Authorization" => "Bearer nope" }, as: :json
    assert_nil response.parsed_body.dig("data", "me")
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end

  test "signing out ends the session" do
    get "/auth/github/callback"
    delete "/logout"
    assert_redirected_to root_path

    inertia_visit :get, "/"
    assert_nil inertia_page.dig("props", "auth", "user")
  end
end
