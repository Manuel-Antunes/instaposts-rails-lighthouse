module Admin
  # The page only renders the shell; the users list and role changes go through GraphQL.
  class UsersController < InertiaController
    def index
      authorize User
      render inertia: {}
    end
  end
end
