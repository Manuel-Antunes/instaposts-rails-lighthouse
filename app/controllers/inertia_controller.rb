# frozen_string_literal: true

# Base for the controllers that render Inertia pages.
class InertiaController < ApplicationController
  include PageQueryRendering

  rescue_from Pundit::NotAuthorizedError, with: :forbidden

  # Props every page receives.
  inertia_share csrf_token: -> { form_authenticity_token }

  inertia_share auth: -> {
    { user: current_user && {
        id: current_user.id,
        name: current_user.name,
        email: current_user.email,
        avatar_url: current_user.avatar_url,
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
      redirect_to login_path, alert: "Sign in to continue."
    end
  end
end
