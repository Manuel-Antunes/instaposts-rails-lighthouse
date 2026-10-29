# frozen_string_literal: true

# `render_preloaded`: render an Inertia page with the result of its pageQuery,
# run through Lighthouse as the signed-in user. See PageQueries.
#
#   def show
#     post = Post.find(params[:id])
#     authorize post
#     render_preloaded variables: { id: post.to_gid_param }
#   end
module PageQueryRendering
  extend ActiveSupport::Concern

  private

  # `component` defaults to the one `render inertia:` infers (posts/show for
  # PostsController#show). `variables` are the pageQuery's; other options go to
  # `render inertia:`. The result is the lazy `page_query` prop: a partial reload
  # that leaves it out does not run the operation.
  def render_preloaded(component = nil, props: {}, variables: {}, **options)
    component ||= inertia_configuration.component_path_resolver(path: controller_path, action: action_name)
    if props.key?(PageQueries::PROP) || props.key?(PageQueries::PROP.to_s)
      raise ArgumentError, "The #{PageQueries::PROP} prop is reserved for the page's pageQuery result"
    end

    query = PageQueries::Preloader.new(context: page_query_context).prepare(component, variables)
    render inertia: component, props: props.merge(PageQueries::PROP => query), **options
  end

  # What GraphqlController gives an operation: the user and what @throttle reads.
  # The user is the session's, never one the caller passes in.
  def page_query_context
    { current_user: current_user, remote_ip: request.remote_ip, lighthouse_controller: self }
  end
end
