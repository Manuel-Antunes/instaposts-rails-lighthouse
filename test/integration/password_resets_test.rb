require "test_helper"

# Devise's recoverable, in paranoid mode.
class PasswordResetsTest < ActionDispatch::IntegrationTest
  def ask_for_reset(email)
    perform_enqueued_jobs { post "/password", params: { user: { email: email } } }
    assert_redirected_to new_user_session_path
    assert_match "If your email address exists in our database", flash[:notice]
  end

  def reset(link, password, confirmation = password)
    token = link[/reset_password_token=([^&\s]+)/, 1]
    patch "/password", params: { user: { reset_password_token: token, password: password, password_confirmation: confirmation } },
                       headers: { "X-Inertia" => "true" }
  end

  def jane = User.create!(name: "Jane", email: "jane@example.com", password: "old-password")

  test "the emailed link sets a new password, once, and signs the user in" do
    user = jane
    ask_for_reset("Jane@Example.com ")
    link = link_in_last_email

    inertia_visit :get, link
    assert_equal "passwords/edit", inertia_page["component"]

    reset(link, "new-password")
    assert_redirected_to root_path
    assert user.reload.valid_password?("new-password")
    assert user.confirmed?, "following the emailed link proves the email"
    inertia_visit :get, "/"
    assert_equal "jane@example.com", inertia_page.dig("props", "auth", "user", "email")

    delete "/logout"
    get link
    assert_redirected_to new_user_password_path
  end

  test "an unknown email gets the same answer, and no email" do
    assert_no_emails { ask_for_reset("nobody@example.com") }
  end

  test "the new password must be valid and confirmed" do
    user = jane
    ask_for_reset("jane@example.com")
    link = link_in_last_email

    [ [ "short" ], [ "new-password", "other" ], [ "" ] ].each do |password, confirmation|
      reset(link, password, confirmation || password)
      assert_redirected_to link.sub(%r{\A/password/edit}, "/password/edit")
    end
    assert user.reload.valid_password?("old-password")
  end

  test "an expired or made-up link is refused" do
    jane
    ask_for_reset("jane@example.com")
    link = link_in_last_email

    travel 16.minutes do
      get link
      assert_redirected_to new_user_password_path
      reset(link, "new-password")
      assert_redirected_to new_user_password_path
    end
    reset("/password/edit?reset_password_token=garbage", "new-password")
    assert_redirected_to new_user_password_path
  end

  test "a user who only signed in with a provider can set a password" do
    ask_for_reset(users(:author).email)
    reset(link_in_last_email, "brand-new-pass")

    assert users(:author).reload.valid_password?("brand-new-pass")
  end

  test "changing the password signs out the user's other sessions" do
    user = jane
    other = open_session
    other.post "/login", params: { user: { email: "jane@example.com", password: "old-password" } }
    other.get "/", headers: { "X-Inertia" => "true", "X-Inertia-Version" => InertiaRails.configuration.version.to_s }
    assert_equal "jane@example.com", other.response.parsed_body.dig("props", "auth", "user", "email")

    ask_for_reset("jane@example.com")
    reset(link_in_last_email, "new-password")
    assert user.reload.valid_password?("new-password")

    other.get "/", headers: { "X-Inertia" => "true", "X-Inertia-Version" => InertiaRails.configuration.version.to_s }
    assert_nil other.response.parsed_body.dig("props", "auth", "user")
  end
end
