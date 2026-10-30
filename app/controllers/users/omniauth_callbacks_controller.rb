# OAuth2 sign-in (Devise's omniauthable): each identity is an Account of the user, see
# User.from_omniauth. When FRONTEND_AUTH_CALLBACK_URL is set the callback also hands a
# JWT to that client for /graphql.
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  PROVIDERS = Rails.configuration.x.omniauth_providers

  # The provider's callback is a cross-site redirect (or POST) carrying no CSRF token.
  skip_forgery_protection only: PROVIDERS

  PROVIDERS.each { |provider| define_method(provider) { sign_in_from_provider } }

  private

  def sign_in_from_provider
    auth = request.env.fetch("omniauth.auth")
    user = User.from_omniauth(auth)
    sign_in(user, event: :authentication)

    if (callback_url = ENV["FRONTEND_AUTH_CALLBACK_URL"].presence)
      # In the fragment so the token stays out of server and proxy logs.
      redirect_to "#{callback_url}##{{ token: AuthToken.encode(user) }.to_query}", allow_other_host: true
    else
      set_flash_message(:notice, :success, kind: auth.provider.to_s.titleize)
      redirect_to after_sign_in_path_for(user)
    end
  rescue User::PasswordAccountExists
    redirect_to new_user_session_path, alert: "An account with this email already exists. Sign in with your password and confirm the email to link it."
  rescue ActiveRecord::RecordInvalid => error
    redirect_to new_user_session_path, alert: error.message
  end
end
