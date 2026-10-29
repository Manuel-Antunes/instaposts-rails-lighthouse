# Email and password sign-in. OAuth2 lives in OmniauthCallbacksController.
class SessionsController < InertiaController
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to login_path, alert: "Too many attempts. Try again later." }

  def new
    return redirect_to root_path if current_user

    render inertia: { providers: Rails.configuration.x.omniauth_providers.map { { id: _1, name: _1.to_s.titleize } } }
  end

  def create
    user = User.authenticate_by(email: params[:email].to_s.strip.downcase, password: params[:password].to_s)

    if user
      sign_in(user)
      redirect_to root_path, notice: "Signed in as #{user.name}."
    else
      redirect_to login_path, alert: "Invalid email or password."
    end
  end

  def destroy
    reset_session
    redirect_to root_path, notice: "Signed out.", status: :see_other
  end
end
