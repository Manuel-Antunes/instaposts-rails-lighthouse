# frozen_string_literal: true

class CommentPolicy < ApplicationPolicy
  # Comments are as public as the posts they are on.
  def index? = true
  def show? = true

  # Anyone signed in can comment.
  def create? = user.present?

  # Only its author edits a comment.
  def update? = user.present? && record.author_id == user.id

  # Its author, the post's author (moderating their post) and admins delete it.
  def destroy? = user.present? && (record.author_id == user.id || record.post.author_id == user.id || user.admin?)

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
