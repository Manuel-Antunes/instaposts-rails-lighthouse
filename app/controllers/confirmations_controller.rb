# Email confirmation: the link in UserMailer#confirmation, and sending it again.
class ConfirmationsController < InertiaController
  rate_limit to: 5, within: 10.minutes, only: :create,
             with: -> { redirect_back_or_to root_path, alert: "Too many emails asked for. Try again later." }

  def show
    user = User.find_by_token_for(:email_confirmation, params[:token])
    return redirect_to root_path, alert: "That confirmation link is invalid or has expired." unless user

    user.confirm!
    redirect_to root_path, notice: "Your email is confirmed."
  end

  # Send the link again to the signed-in user.
  def create
    return redirect_to login_path, alert: "Sign in to confirm your email." unless current_user
    return redirect_back_or_to root_path, notice: "Your email is already confirmed." if current_user.confirmed?

    UserMailer.confirmation(current_user).deliver_later
    redirect_back_or_to root_path, notice: "We sent a new confirmation link to #{current_user.email}."
  end
end
