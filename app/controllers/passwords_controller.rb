# "Forgot your password?": an email with a link (UserMailer#password_reset), then a
# new password. The link comes from has_secure_password's reset token: it expires in
# 15 minutes and stops working once the password changes.
class PasswordsController < InertiaController
  rate_limit to: 5, within: 10.minutes, only: :create,
             with: -> { redirect_to new_password_path, alert: "Too many attempts. Try again later." }

  before_action :set_user_by_token, only: %i[edit update]

  def new
    render inertia: {}
  end

  # The same answer whether the email has an account or not, so the form does not tell.
  def create
    if (user = User.find_by(email: params[:email].to_s.strip.downcase))
      UserMailer.password_reset(user).deliver_later
    end
    redirect_to login_path, notice: "If an account uses that email, we sent it a link to reset the password."
  end

  def edit
    render inertia: { token: params[:token] }
  end

  def update
    @user.assign_attributes(params.permit(:password, :password_confirmation))
    # Following the emailed link proved the email is theirs.
    @user.confirmed_at ||= Time.current

    if @user.save(context: :password_reset)
      reset_session
      redirect_to login_path, notice: "Your password was changed. Sign in with it."
    else
      redirect_to edit_password_path(params[:token]), inertia: { errors: @user.errors }
    end
  end

  private

  def set_user_by_token
    @user = User.find_by_password_reset_token(params[:token])
    redirect_to new_password_path, alert: "That reset link is invalid or has expired." unless @user
  end
end
