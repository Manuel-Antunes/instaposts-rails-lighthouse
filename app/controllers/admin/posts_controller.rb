module Admin
  # The trash: its first page comes from TrashPage; restoring and deleting for good go
  # through /graphql (@restore, @forceDelete).
  class PostsController < InertiaController
    def index
      authorize Post, :trash?
      render_preloaded
    end
  end
end
