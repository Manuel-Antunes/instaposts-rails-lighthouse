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

  def new
    authorize Post
    render inertia: {}
  end

  def create
    post = Post.new(post_params.merge(author: current_user))
    authorize post

    if post.save
      redirect_to post_path(post), notice: "Post created."
    else
      redirect_to new_post_path, inertia: { errors: post.errors }
    end
  end

  private

  def post_params = params.permit(:name, :content)
end
