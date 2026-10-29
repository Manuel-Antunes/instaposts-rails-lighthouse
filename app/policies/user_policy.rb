# frozen_string_literal: true

class UserPolicy < ApplicationPolicy
  def show? = true

  # Only admins list users.
  def index? = admin?

  # Admins change roles, but never their own: that could leave no admin at all.
  def update_role? = admin? && user != record

  # A user's email is visible to themselves and to admins.
  def view_email? = user.present? && (user == record || admin?)

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
