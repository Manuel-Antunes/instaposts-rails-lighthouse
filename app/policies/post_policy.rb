# frozen_string_literal: true

class PostPolicy < ApplicationPolicy
  # Anyone, signed in or not, can read posts.
  def index? = true
  def show? = true

  # Only authors and admins can write posts.
  def create? = user.present? && user.author_or_admin?

  # Anyone signed in can like a post.
  def like? = user.present?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
