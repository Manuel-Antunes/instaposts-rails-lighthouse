class ApplicationController < ActionController::Base
  include Pundit::Authorization

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  helper_method :current_user

  private

  # The user signed in through the browser session, nil for guests. /graphql
  # authenticates with a bearer JWT instead (see GraphqlController).
  def current_user
    return @current_user if defined?(@current_user)

    @current_user = User.find_by(id: session[:user_id])
  end

  def sign_in(user)
    reset_session
    session[:user_id] = user.id
  end
end
