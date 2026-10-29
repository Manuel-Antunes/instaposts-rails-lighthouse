module Admin
  # The first page of users comes from UsersPage; more pages and role changes go through /graphql.
  class UsersController < InertiaController
    def index
      authorize User
      render_preloaded
    end
  end
end
