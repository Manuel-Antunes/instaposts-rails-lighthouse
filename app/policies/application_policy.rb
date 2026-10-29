# frozen_string_literal: true

# Deny by default; each policy opens up what it allows. `user` is nil for guests.
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index? = false
  def show? = false
  def create? = false
  def new? = create?
  def update? = false
  def edit? = update?
  def destroy? = false

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      raise NoMethodError, "You must define #resolve in #{self.class}"
    end

    private

    attr_reader :user, :scope
  end

  private

  # Writing (posting, liking, commenting) waits for a confirmed email.
  def confirmed? = user.present? && user.confirmed?

  def admin? = user.present? && user.admin?
end
