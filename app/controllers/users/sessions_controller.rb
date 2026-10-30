# Email and password sign-in (Devise), on an Inertia page. OAuth2 lives in OmniauthCallbacksController.
class Users::SessionsController < Devise::SessionsController
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to new_user_session_path, alert: "Too many attempts. Try again later." }

  def new
    render inertia: "sessions/new", props: {
      providers: Rails.configuration.x.omniauth_providers.map { { id: _1, name: _1.to_s.titleize } }
    }
  end

  # Signing out also has Inertia forget the history it kept encrypted in the browser, so
  # going back cannot show what the user saw. Set after Devise resets the session.
  def destroy
    super { session[:inertia_clear_history] = true }
  end

  protected

  # No recall of #new on a wrong password: Devise's failure app redirects back to /login
  # with the error in the flash, which is what an Inertia form expects.
  def auth_options = { scope: resource_name }
end
