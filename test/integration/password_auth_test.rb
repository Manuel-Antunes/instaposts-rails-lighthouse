require "test_helper"

class PasswordAuthTest < ActionDispatch::IntegrationTest
  SIGNUP = { name: "Jane Doe", email: "Jane@Example.com", password: "s3cret-pass", password_confirmation: "s3cret-pass" }.freeze

  test "signing up creates a reader and signs them in" do
    assert_difference "User.count", 1 do
      post "/signup", params: SIGNUP
    end
    assert_redirected_to root_path

    user = User.find_by!(email: "jane@example.com")
    assert user.reader?
    assert user.authenticate("s3cret-pass")

    inertia_visit :get, "/"
    assert_equal "jane@example.com", inertia_page.dig("props", "auth", "user", "email")
  end

  test "signing up needs a valid, confirmed password and a free email" do
    [
      SIGNUP.merge(password: "", password_confirmation: ""),
      SIGNUP.merge(password: "short", password_confirmation: "short"),
      SIGNUP.merge(password_confirmation: "different"),
      SIGNUP.merge(email: users(:author).email),
      SIGNUP.merge(email: "not-an-email")
    ].each do |params|
      assert_no_difference "User.count" do
        post "/signup", params: params, headers: { "X-Inertia" => "true" }
      end
      assert_redirected_to signup_path
    end

    inertia_visit :get, "/signup"
    assert_not_empty inertia_page.dig("props", "errors")
  end

  test "signing in with the right password" do
    post "/signup", params: SIGNUP
    delete "/logout"

    post "/login", params: { email: " JANE@example.com ", password: "s3cret-pass" }
    assert_redirected_to root_path

    inertia_visit :get, "/"
    assert_equal "Jane Doe", inertia_page.dig("props", "auth", "user", "name")
  end

  test "signing in fails with a wrong password, an unknown email or no password set" do
    post "/signup", params: SIGNUP
    delete "/logout"

    [
      { email: "jane@example.com", password: "wrong-password" },
      { email: "nobody@example.com", password: "s3cret-pass" },
      { email: users(:author).email, password: "" } # signed up with OAuth only
    ].each do |credentials|
      post "/login", params: credentials
      assert_redirected_to login_path

      inertia_visit :get, "/"
      assert_nil inertia_page.dig("props", "auth", "user")
    end
  end

  test "signed in users are sent away from the login and signup pages" do
    post "/signup", params: SIGNUP

    get "/login"
    assert_redirected_to root_path
    get "/signup"
    assert_redirected_to root_path
  end

  test "an OAuth2 sign-in never links to an account registered with a password" do
    post "/signup", params: SIGNUP
    delete "/logout"

    OmniAuth.config.test_mode = true
    Rails.application.env_config["omniauth.auth"] = OmniAuth::AuthHash.new(
      provider: "github", uid: "attacker-or-owner", info: { email: "jane@example.com", name: "Jane" }
    )

    assert_no_difference "Account.count" do
      get "/auth/github/callback"
    end
    assert_redirected_to login_path

    inertia_visit :get, "/"
    assert_nil inertia_page.dig("props", "auth", "user")
  ensure
    OmniAuth.config.test_mode = false
    Rails.application.env_config.delete("omniauth.auth")
  end
end
