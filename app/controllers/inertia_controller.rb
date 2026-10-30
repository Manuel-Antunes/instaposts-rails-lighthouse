# frozen_string_literal: true

# Base for the controllers that render Inertia pages.
class InertiaController < ApplicationController
  include PageQueryRendering

  rescue_from Pundit::NotAuthorizedError, with: :forbidden

  # Props every page receives.
  inertia_share csrf_token: -> { form_authenticity_token }

  # The site's address, for links to share: APP_URL (as for OmniAuth and the mailers),
  # else the one the request came in on.
  inertia_share site_url: -> { ENV["APP_URL"].presence&.chomp("/") || request.base_url }

  inertia_share auth: -> {
    { user: current_user && {
        id: current_user.id,
        name: current_user.name,
        email: current_user.email,
        username: current_user.username,
        avatar_url: current_user.picture_url,
        role: current_user.role,
        confirmed: current_user.confirmed?,
        can_create_post: policy(Post).create?
      } }
  }

  private

  def forbidden
    if current_user
      redirect_back_or_to root_path, alert: "You are not allowed to do that."
    else
      redirect_to new_user_session_path, alert: "Sign in to continue."
    end
  end
end
