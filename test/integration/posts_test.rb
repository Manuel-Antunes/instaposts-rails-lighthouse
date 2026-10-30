require "test_helper"

class PostsTest < ActionDispatch::IntegrationTest
  test "guests can list and read posts" do
    inertia_visit :get, "/"
    assert_response :success
    assert_equal "posts/index", inertia_page["component"]
    assert_equal 3, inertia_page.dig("props", "page_query", "data", "posts", "edges").size
    assert_nil inertia_page.dig("props", "auth", "user")

    inertia_visit :get, "/posts/#{posts(:one).id}"
    assert_equal "posts/show", inertia_page["component"]
    assert_equal "First", inertia_page.dig("props", "page_query", "data", "post", "name")
  end

  test "the feed's first page has 10 posts, and /graphql the next ones" do
    12.times { |i| Post.create!(name: "P#{i}", content: "c", author: users(:author)) }

    inertia_visit :get, "/"
    posts = inertia_page.dig("props", "page_query", "data", "posts")
    assert_equal 10, posts["edges"].size
    assert posts.dig("pageInfo", "hasNextPage")

    after = posts.dig("pageInfo", "endCursor")
    rest = gql(%({ posts(first: 10, after: "#{after}", orderBy: [{ column: CREATED_AT, order: DESC }]) { edges { node { name } } pageInfo { hasNextPage } } }))
    assert_equal 5, rest.dig("data", "posts", "edges").size
    assert_not rest.dig("data", "posts", "pageInfo", "hasNextPage")
    assert_empty posts["edges"].map { _1.dig("node", "name") } & rest.dig("data", "posts", "edges").map { _1.dig("node", "name") }
  end

  test "posts created at the same moment are each on one page" do
    at = 1.minute.from_now
    5.times { |i| Post.create!(name: "Tied #{i}", content: "c", author: users(:author), created_at: at) }

    page = ->(after) { gql(%({ posts(first: 2#{after && %(, after: "#{after}")}, orderBy: [{ column: CREATED_AT, order: DESC }]) { edges { node { name } } pageInfo { endCursor } } })).dig("data", "posts") }
    names = []
    after = nil
    3.times do
      result = page.(after)
      names.concat(result["edges"].map { _1.dig("node", "name") })
      after = result.dig("pageInfo", "endCursor")
    end

    assert_equal 5.times.map { "Tied #{_1}" }, names.first(5)
  end

  test "a post is found by a post's id only" do
    post = posts(:one)
    query = "query($id: ID!) { post(id: $id) { name } }"

    assert_equal "First", gql(query, variables: { id: post.to_gid_param }).dig("data", "post", "name")
    result = gql(query, variables: { id: global_id("User", post.id) })
    assert_nil result.dig("data", "post")
    assert_match(/is not a valid global id for Post\./, result.dig("errors", 0, "message"))
  end

  test "a missing post is a 404" do
    get "/posts/0"
    assert_response :not_found
  end

  test "the new post page is for authors and admins" do
    get "/posts/new"
    assert_redirected_to new_user_session_path

    sign_in_as users(:reader)
    get "/posts/new"
    assert_redirected_to root_path
    assert_not inertia_page_can_create?

    sign_in_as users(:author)
    assert inertia_page_can_create?
    inertia_visit :get, "/posts/new"
    assert_equal "posts/new", inertia_page["component"]
  end

  test "the login page lists the configured providers" do
    inertia_visit :get, "/login"
    assert_equal "sessions/new", inertia_page["component"]
    assert_kind_of Array, inertia_page.dig("props", "providers")
  end

  private

  def inertia_page_can_create?
    inertia_visit :get, "/"
    inertia_page.dig("props", "auth", "user", "can_create_post")
  end
end
