require "test_helper"

class PasswordResetsTest < ActionDispatch::IntegrationTest
  def ask_for_reset(email)
    perform_enqueued_jobs { post "/passwords", params: { email: email } }
    assert_redirected_to login_path
    assert_equal "If an account uses that email, we sent it a link to reset the password.", flash[:notice]
  end

  def sign_in(email, password)
    post "/login", params: { email: email, password: password }
    inertia_visit :get, "/"
    inertia_page.dig("props", "auth", "user", "email")
  end

  test "the emailed link sets a new password, once" do
    user = User.create!(name: "Jane", email: "jane@example.com", password: "old-password")
    ask_for_reset("Jane@Example.com ")
    link = link_in_last_email

    inertia_visit :get, link
    assert_equal "passwords/edit", inertia_page["component"]

    patch link.delete_suffix("/edit"), params: { password: "new-password", password_confirmation: "new-password" }
    assert_redirected_to login_path
    assert user.reload.authenticate("new-password")
    assert user.confirmed?, "following the emailed link proves the email"

    get link
    assert_redirected_to new_password_path
    assert_equal "jane@example.com", sign_in("jane@example.com", "new-password")
  end

  test "an unknown email gets the same answer, and no email" do
    assert_no_emails { ask_for_reset("nobody@example.com") }
  end

  test "the new password must be valid and confirmed" do
    User.create!(name: "Jane", email: "jane@example.com", password: "old-password")
    ask_for_reset("jane@example.com")
    path = link_in_last_email.delete_suffix("/edit")

    [ { password: "short", password_confirmation: "short" }, { password: "new-password", password_confirmation: "other" },
      { password: "", password_confirmation: "" } ].each do |params|
      patch path, params: params, headers: { "X-Inertia" => "true" }
      assert_redirected_to "#{path}/edit"
    end
    assert User.find_by(email: "jane@example.com").authenticate("old-password")
  end

  test "an expired or made-up link is refused" do
    User.create!(name: "Jane", email: "jane@example.com", password: "old-password")
    ask_for_reset("jane@example.com")
    link = link_in_last_email

    travel 16.minutes do
      get link
      assert_redirected_to new_password_path
    end
    patch "/passwords/garbage", params: { password: "new-password", password_confirmation: "new-password" }
    assert_redirected_to new_password_path
  end

  test "a user who only signed in with a provider can set a password" do
    ask_for_reset(users(:author).email)
    patch link_in_last_email.delete_suffix("/edit"), params: { password: "brand-new-pass", password_confirmation: "brand-new-pass" }

    assert users(:author).reload.authenticate("brand-new-pass")
  end
end
