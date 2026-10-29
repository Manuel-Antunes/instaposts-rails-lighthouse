require "test_helper"

class UserMailerTest < ActionMailer::TestCase
  test "confirmation links to the confirmation of the email" do
    user = users(:reader)
    mail = UserMailer.confirmation(user)

    assert_equal [ user.email ], mail.to
    assert_equal "Confirm your email", mail.subject
    token = mail.text_part.body.to_s[%r{/confirmations/(\S+)}, 1]
    assert_equal user, User.find_by_token_for(:email_confirmation, token)
  end

  test "password_reset links to choosing a new password" do
    user = User.create!(name: "Jane", email: "jane@example.com", password: "old-password")
    mail = UserMailer.password_reset(user)

    assert_equal "Reset your password", mail.subject
    token = mail.html_part.body.to_s[%r{/passwords/([^/"]+)/edit}, 1]
    assert_equal user, User.find_by_password_reset_token(token)
  end
end
