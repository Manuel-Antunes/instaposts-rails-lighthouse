require "test_helper"

class PasswordAuthTest < ActionDispatch::IntegrationTest
  SIGNUP = { name: "Jane Doe", email: "Jane@Example.com", password: "s3cret-pass", password_confirmation: "s3cret-pass" }.freeze

  def sign_up(**overrides) = post("/signup", params: { user: SIGNUP.merge(overrides) })
  def log_in(email, password) = post("/login", params: { user: { email: email, password: password } })

  test "signing up creates a reader and signs them in" do
    assert_difference "User.count", 1 do
      sign_up
    end
    assert_redirected_to root_path

    user = User.find_by!(email: "jane@example.com")
    assert user.reader?
    assert user.valid_password?("s3cret-pass")

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
        post "/signup", params: { user: params }, headers: { "X-Inertia" => "true" }
      end
      assert_redirected_to new_user_registration_path
    end

    inertia_visit :get, "/signup"
    assert_not_empty inertia_page.dig("props", "errors")
  end

  test "signing in with the right password" do
    sign_up
    delete "/logout"

    log_in(" JANE@example.com ", "s3cret-pass")
    assert_redirected_to root_path

    inertia_visit :get, "/"
    assert_equal "Jane Doe", inertia_page.dig("props", "auth", "user", "name")
  end

  test "signing in fails with a wrong password, an unknown email or no password set" do
    sign_up
    delete "/logout"

    [
      { email: "jane@example.com", password: "wrong-password" },
      { email: "nobody@example.com", password: "s3cret-pass" },
      { email: users(:author).email, password: "" } # signed up with OAuth only
    ].each do |credentials|
      log_in(credentials[:email], credentials[:password])
      assert_redirected_to new_user_session_path

      inertia_visit :get, "/"
      assert_nil inertia_page.dig("props", "auth", "user")
    end
  end

  test "signed in users are sent away from the login and signup pages" do
    sign_up

    get "/login"
    assert_redirected_to root_path
    get "/signup"
    assert_redirected_to root_path
  end

  test "an OAuth2 sign-in never links to an account registered with a password" do
    sign_up
    delete "/logout"

    mock_oauth(uid: "attacker-or-owner", email: "jane@example.com", name: "Jane")

    assert_no_difference "Account.count" do
      get "/auth/github/callback"
    end
    assert_redirected_to new_user_session_path

    inertia_visit :get, "/"
    assert_nil inertia_page.dig("props", "auth", "user")
  end

  test "remember me keeps the user signed in after the session ends" do
    sign_up
    delete "/logout"

    post "/login", params: { user: { email: "jane@example.com", password: "s3cret-pass", remember_me: "1" } }
    assert cookies["remember_user_token"].present?
    assert User.find_by!(email: "jane@example.com").remember_created_at
  end

  test "sign-ins are tracked" do
    sign_up
    delete "/logout"
    log_in("jane@example.com", "s3cret-pass")

    user = User.find_by!(email: "jane@example.com")
    assert_equal 2, user.sign_in_count
    assert_equal "127.0.0.1", user.last_sign_in_ip
  end

  test "signing out clears the history Inertia keeps in the browser" do
    sign_up

    delete "/logout"
    inertia_visit :get, "/"
    assert_equal true, inertia_page["clearHistory"]

    inertia_visit :get, "/"
    assert_nil inertia_page["clearHistory"], "only the first page after signing out"
  end
end
