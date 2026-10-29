module Activatable
  extend ActiveSupport::Concern

  included do
    before_validation :activate, on: :create

    validates :active, inclusion: { in: [ true, false ] }
  end

  private

  def activate
    self.active = true
  end
end
