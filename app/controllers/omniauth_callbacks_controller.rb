# OAuth2 sign-in through OmniAuth. The callback starts a browser session; when
# FRONTEND_AUTH_CALLBACK_URL is set it also hands a JWT to that client for /graphql.
class OmniauthCallbacksController < InertiaController
  # The provider callback is a cross-site redirect (or POST) carrying no CSRF token.
  skip_forgery_protection only: :create

  def create
    user = User.from_omniauth(request.env.fetch("omniauth.auth"))
    sign_in(user)

    if (callback_url = ENV["FRONTEND_AUTH_CALLBACK_URL"].presence)
      # In the fragment so the token stays out of server and proxy logs.
      fragment = { token: AuthToken.encode(user) }.to_query
      redirect_to "#{callback_url}##{fragment}", allow_other_host: true
    else
      redirect_to root_path, notice: "Signed in as #{user.name}."
    end
  rescue User::PasswordAccountExists
    redirect_to login_path, alert: "An account with this email already exists. Sign in with your password and confirm the email to link it."
  rescue ActiveRecord::RecordInvalid => error
    redirect_to login_path, alert: error.message
  end

  def failure
    redirect_to login_path, alert: "Sign in failed: #{params[:message].to_s.humanize}."
  end
end
