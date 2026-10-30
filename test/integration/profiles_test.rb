require "test_helper"

class ProfilesTest < ActionDispatch::IntegrationTest
  def jane = User.create!(name: "Jane", email: "jane@example.com", password: "s3cret-pass", confirmed_at: Time.current)

  def sign_in_jane
    jane
    post "/login", params: { user: { email: "jane@example.com", password: "s3cret-pass" } }
  end

  test "the profile page preloads the signed-in user" do
    get "/profile"
    assert_redirected_to new_user_session_path

    sign_in_jane
    inertia_visit :get, "/profile"
    assert_equal "profiles/show", inertia_page["component"]
    assert_equal "ProfilePage", inertia_page.dig("props", "page_query", "operation")
    assert_equal({ "name" => "Jane", "email" => "jane@example.com" }, inertia_page.dig("props", "page_query", "data", "me").slice("name", "email"))
    assert_equal true, inertia_page.dig("props", "has_password")
  end

  test "a new password needs the current one" do
    sign_in_jane

    patch "/account", params: { user: { email: "jane@example.com", password: "new-password", password_confirmation: "new-password", current_password: "wrong" } },
                      headers: { "X-Inertia" => "true" }
    assert_redirected_to profile_path
    assert User.find_by!(email: "jane@example.com").valid_password?("s3cret-pass")

    patch "/account", params: { user: { email: "jane@example.com", password: "new-password", password_confirmation: "new-password", current_password: "s3cret-pass" } }
    assert_redirected_to profile_path
    assert User.find_by!(email: "jane@example.com").valid_password?("new-password")
  end

  test "a new email waits for its confirmation, sent to it" do
    sign_in_jane

    perform_enqueued_jobs do
      patch "/account", params: { user: { email: "jane@elsewhere.com", current_password: "s3cret-pass" } }
    end
    user = User.find_by!(email: "jane@example.com")
    assert_equal "jane@elsewhere.com", user.unconfirmed_email
    assert_equal [ "jane@elsewhere.com" ], ActionMailer::Base.deliveries.last.to

    get link_in_last_email
    assert_equal "jane@elsewhere.com", user.reload.email
  end

  test "a user who only signs in with a provider sets a password without a current one" do
    sign_in_as users(:author)
    inertia_visit :get, "/profile"
    assert_equal false, inertia_page.dig("props", "has_password")

    patch "/account", params: { user: { email: users(:author).email, password: "brand-new-pass", password_confirmation: "brand-new-pass" } }
    assert_redirected_to profile_path
    assert users(:author).reload.valid_password?("brand-new-pass")
  end
end
