class UserMailer < ApplicationMailer
  # The link that confirms the user owns their email.
  def confirmation(user)
    @user = user
    @url = confirmation_url(user.generate_token_for(:email_confirmation))
    mail to: user.email, subject: "Confirm your email"
  end

  # The link to choose a new password. It works once, for 15 minutes (has_secure_password).
  def password_reset(user)
    @user = user
    @url = edit_password_url(user.password_reset_token)
    mail to: user.email, subject: "Reset your password"
  end
end
