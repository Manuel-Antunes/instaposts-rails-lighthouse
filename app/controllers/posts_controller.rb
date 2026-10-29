class PostsController < InertiaController
  PER_PAGE = 10

  def index
    authorize Post
    page = [ params[:page].to_i, 1 ].max
    posts = policy_scope(Post).includes(:author).order(created_at: :desc, id: :desc)
                              .offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1).to_a

    render inertia: {
      posts: posts.first(PER_PAGE).map { post_json(_1) },
      page: page,
      has_next_page: posts.size > PER_PAGE
    }
  end

  def show
    post = Post.find(params[:id])
    authorize post

    render inertia: { post: post_json(post) }
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

  def post_json(post)
    {
      id: post.id,
      name: post.name,
      content: post.content,
      created_at: post.created_at,
      author: post.author && { id: post.author.id, name: post.author.name, avatar_url: post.author.avatar_url }
    }
  end
end
