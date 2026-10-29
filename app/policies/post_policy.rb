# frozen_string_literal: true

class PostPolicy < ApplicationPolicy
  # Anyone, signed in or not, reads posts; only admins list the trashed ones
  # (`trashed: ONLY` or `WITH`, which @canModel(injectArgs: true) passes in).
  def index?(args = {})
    trashed = args[:trashed]
    trashed.nil? || trashed.to_s.casecmp?("without") || admin?
  end

  def show? = true

  # Only authors and admins write posts, once their email is confirmed.
  def create? = confirmed? && user.author_or_admin?

  # Its author or an admin moves a post to the trash.
  def destroy? = user.present? && (record.author_id == user.id || user.admin?)

  # The trash is the admins': they see it, restore a post or delete it for good.
  def trash? = admin?
  def restore? = trash?
  def force_delete? = trash?

  # Anyone with a confirmed email likes a post.
  def like? = confirmed?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
