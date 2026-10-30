class PostsController < InertiaController
  # The feed: its first page comes from PostsFeedPage, the next ones from /graphql.
  def index
    authorize Post
    render_preloaded
  end

  def show
    post = Post.find(params[:id])
    authorize post
    render_preloaded variables: { id: post.to_gid_param }
  end

  # The form; publishing goes through /graphql (createPost), with the files.
  def new
    authorize Post
    render inertia: {}
  end
end
