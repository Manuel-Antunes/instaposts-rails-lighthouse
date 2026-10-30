# Email confirmation (Devise's confirmable): the emailed link, and sending it again.
class Users::ConfirmationsController < Devise::ConfirmationsController
  rate_limit to: 5, within: 10.minutes, only: :create,
             with: -> { redirect_back_or_to root_path, alert: "Too many emails asked for. Try again later." }

  def new
    render inertia: "confirmations/new"
  end

  def show
    super do |user|
      return redirect_to root_path, alert: "That confirmation link is invalid or has expired." if user.errors.any?
    end
  end

  protected

  # Asked from the banner while signed in: back to the app, not to /login.
  def after_resending_confirmation_instructions_path_for(_resource_name)
    user_signed_in? ? root_path : new_user_session_path
  end
end
