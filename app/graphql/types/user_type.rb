# frozen_string_literal: true

module Types
  # Resolves the fields of the SDL's User that no directive does.
  class UserType < BaseObject
    def avatar_url = object.picture_url
  end
end
