require "test_helper"

# render_preloaded end to end: the operation each page declares comes from the test
# build's Vite manifest (see test_helper), and runs as the session's user.
class PageQueriesTest < ActionDispatch::IntegrationTest
  def page_query = inertia_page.dig("props", "page_query")

  test "the feed preloads its first page, newest first" do
    Post.create!(name: "Newest", content: "c", author: users(:author))

    inertia_visit :get, "/"
    assert_equal "posts/index", inertia_page["component"]
    assert_equal "PostsFeedPage", page_query["operation"]
    assert_equal({}, page_query["variables"])
    assert_match(/\A\h{64}\z/, page_query["sha256"])

    nodes = page_query.dig("data", "posts", "edges").map { _1["node"] }
    assert_equal [ "Newest", "Admin post", "Second", "First" ], nodes.map { _1["name"] }
    assert_equal "Post", nodes.first["__typename"]
    # Links use the route Rails gives, not the global id.
    assert_equal "/posts/#{posts(:one).id}", nodes.last["path"]
  end

  test "the result is the signed-in user's" do
    liked = -> { page_query.dig("data", "posts", "edges").to_h { [ _1.dig("node", "name"), _1.dig("node", "viewerHasLiked") ] }["First"] }

    inertia_visit :get, "/"
    assert_equal false, liked.call

    sign_in_as users(:reader)
    inertia_visit :get, "/"
    assert_equal true, liked.call
  end

  test "a post's page preloads the post and its first comments" do
    inertia_visit :get, "/posts/#{posts(:one).id}"

    assert_equal "PostShowPage", page_query["operation"]
    assert_equal({ "id" => posts(:one).to_gid_param }, page_query["variables"])
    post = page_query.dig("data", "post")
    assert_equal [ "First", 2 ], post.values_at("name", "likesCount")
    assert_equal [ "Nice post", "Agreed" ], post.dig("comments", "edges").map { _1.dig("node", "body") }
  end

  test "the admin page preloads the users as the admin" do
    sign_in_as users(:admin)
    inertia_visit :get, "/admin/users"

    assert_equal "UsersPage", page_query["operation"]
    assert_nil page_query["errors"]
    assert_equal User.count, page_query.dig("data", "users", "edges").size
  end

  test "a page without a pageQuery gets none" do
    sign_in_as users(:author)
    inertia_visit :get, "/posts/new"

    assert_equal "posts/new", inertia_page["component"]
    assert_nil page_query
  end

  # The context of each operation Lighthouse runs while the block does (its StartExecution
  # event), by operation name.
  def contexts
    seen = {}
    listener = Lighthouse::Events.listen(Lighthouse::Events::StartExecution) { seen[_1.operation_name] = _1.context }
    yield
    seen
  ensure
    Lighthouse::Events.forget(listener)
  end

  test "a page's operation runs as the session's user, with what @throttle reads" do
    sign_in_as users(:admin)
    context = contexts { inertia_visit :get, "/admin/users", env: { "REMOTE_ADDR" => "203.0.113.7" } }.fetch("UsersPage")

    assert_equal users(:admin), context[:current_user]
    assert_equal "203.0.113.7", context[:remote_ip]
    assert_instance_of Admin::UsersController, context[:lighthouse_controller]
  end

  test "a guest's page runs as no one" do
    context = contexts { inertia_visit :get, "/@alice" }.fetch("UserShowPage")

    assert_nil context[:current_user]
    assert_instance_of UsersController, context[:lighthouse_controller]
  end

  test "a page's operation gets the context /graphql gives the same user" do
    page = contexts do
      sign_in_as users(:author)
      inertia_visit :get, "/profile"
    end.fetch("ProfilePage")
    api = contexts { gql("query ProfileProbe { me { id } }", as: users(:author)) }.fetch("ProfileProbe")

    # The same keys: one GraphqlController#graphql_context adds, the pages would miss.
    assert_equal api.to_h.keys.sort, page.to_h.keys.sort
    assert_equal api[:current_user], page[:current_user]
    assert_equal users(:author), page[:current_user]
  end

  test "a partial reload without page_query does not run it" do
    runs = 0
    callback = ->(*) { runs += 1 }
    ActiveSupport::Notifications.subscribed(callback, "preload.page_queries") do
      inertia_visit :get, "/", headers: { "X-Inertia-Partial-Component" => "posts/index", "X-Inertia-Partial-Data" => "auth" }
    end

    assert_equal 0, runs
    assert_not inertia_page["props"].key?("page_query")
  end

  test "the full page renders the preloaded result into the HTML" do
    get "/posts/#{posts(:one).id}"

    assert_response :success
    assert_includes response.body, "PostShowPage"
    assert_includes response.body, "Nice post"
  end

  test "page_query is reserved" do
    controller = PostsController.new
    error = assert_raises(ArgumentError) { controller.send(:render_preloaded, "posts/index", props: { page_query: 1 }) }
    assert_match "reserved", error.message
  end
end
