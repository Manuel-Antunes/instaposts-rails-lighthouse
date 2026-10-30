# "Forgot your password?" (Devise's recoverable): the link expires in 15 minutes, works
# once, and signs the user in. Devise's paranoid mode answers the same for unknown emails.
class Users::PasswordsController < Devise::PasswordsController
  rate_limit to: 5, within: 10.minutes, only: :create,
             with: -> { redirect_to new_user_password_path, alert: "Too many attempts. Try again later." }

  def new
    render inertia: "passwords/new"
  end

  def edit
    token = params[:reset_password_token].to_s
    user = User.with_reset_password_token(token)
    return redirect_to new_user_password_path, alert: invalid_link unless user&.reset_password_period_valid?

    render inertia: "passwords/edit", props: { reset_password_token: token }
  end

  def update
    super do |user|
      next if user.errors.empty?
      return redirect_to new_user_password_path, alert: invalid_link if user.errors.include?(:reset_password_token)

      return redirect_to edit_user_password_path(reset_password_token: params.dig(:user, :reset_password_token)),
                         inertia: { errors: user.errors }
    end
  end

  private

  def invalid_link = "That reset link is invalid or has expired."
end
