# frozen_string_literal: true

class PostPolicy < ApplicationPolicy
  # Anyone, signed in or not, reads posts.
  def index? = true
  def show? = true

  # Only authors and admins write posts, once their email is confirmed.
  def create? = confirmed? && user.author_or_admin?

  # Its author or an admin moves a post to the trash.
  def destroy? = user.present? && (record.author_id == user.id || user.admin?)

  # The trash is the admins': they see it, restore a post or delete it for good.
  # view_trashed?: whoever passes Query.posts the `trashed` argument (@softDeletes).
  def trash? = admin?
  def view_trashed? = trash?
  def restore? = trash?
  def force_delete? = trash?

  # Anyone with a confirmed email likes a post.
  def like? = confirmed?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
