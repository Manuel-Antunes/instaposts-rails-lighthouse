require "test_helper"

# A user's public page: anyone sees their picture and a grid of their posts.
class PublicProfilesTest < ActionDispatch::IntegrationTest
  GRID = <<~GQL.freeze
    query($username: String!, $after: String) {
      user(by: { username: $username }) {
        name email postsCount
        posts(first: 2, after: $after, orderBy: [{ column: CREATED_AT, order: DESC }]) {
          edges { node { name } } pageInfo { hasNextPage endCursor }
        }
      }
    }
  GQL

  CREATE = <<~GQL.freeze
    mutation($files: [Upload!]) { createPost(input: { name: "Trip", content: "Pictures", files: $files }) { id } }
  GQL

  def page_query = inertia_page.dig("props", "page_query")

  test "guests see a user's page, with their posts newest first" do
    inertia_visit :get, "/@alice"

    assert_response :success
    assert_equal "users/show", inertia_page["component"]
    assert_equal "UserShowPage", page_query["operation"]
    assert_equal({ "username" => "alice" }, page_query["variables"])
    user = page_query.dig("data", "user")
    assert_equal [ "Alice Author", "alice", 2 ], user.values_at("name", "username", "postsCount")
    assert_equal [ "Second", "First" ], user.dig("posts", "edges").map { _1.dig("node", "name") }
    assert_nil user["email"], "the email is not public"
  end

  test "the page carries what the grid shows: the cover, the counts and the post's path" do
    gql_upload(CREATE, as: users(:author), variables: { files: [ nil, nil ] }, files: { "files.0" => "photo.png", "files.1" => "clip.mp4" })

    inertia_visit :get, "/@alice"
    newest = page_query.dig("data", "user", "posts", "edges", 0, "node")
    assert_equal "Trip", newest["name"]
    assert_equal [ "IMAGE", "VIDEO" ], newest["assets"].map { _1["kind"] }
    assert_equal [ 0, 0, "/posts/#{Post.find_by!(name: 'Trip').id}" ], newest.values_at("likesCount", "commentsCount", "path")
  end

  test "trashed posts are in neither the grid nor the count" do
    posts(:two).discard!

    inertia_visit :get, "/@alice"
    user = page_query.dig("data", "user")
    assert_equal 1, user["postsCount"]
    assert_equal [ "First" ], user.dig("posts", "edges").map { _1.dig("node", "name") }
  end

  test "a user without posts gets an empty grid" do
    inertia_visit :get, "/@rita"
    assert_equal 0, page_query.dig("data", "user", "postsCount")
    assert_empty page_query.dig("data", "user", "posts", "edges")
  end

  test "a missing user is a 404, and so is the old /users/:id" do
    get "/@nobody"
    assert_response :not_found

    get "/users/#{users(:author).id}"
    assert_response :not_found
  end

  test "an address is one per person: /@Alice goes to /@alice" do
    get "/@Alice"
    assert_redirected_to "/@alice"
    assert_response :moved_permanently
  end

  test "a username with periods is a page too" do
    users(:author).update!(username: "alice.author")

    inertia_visit :get, "/@alice.author"
    assert_response :success
    assert_equal "alice.author", page_query.dig("data", "user", "username")
  end

  test "the grid pages with cursors, on /graphql, for guests too" do
    3.times { |i| Post.create!(name: "P#{i}", content: "c", author: users(:reader), created_at: i.minutes.from_now) }
    first = gql(GRID, variables: { username: "rita" }).dig("data", "user")
    assert_equal [ "P2", "P1" ], first.dig("posts", "edges").map { _1.dig("node", "name") }
    assert_equal 3, first["postsCount"]
    assert first.dig("posts", "pageInfo", "hasNextPage")

    rest = gql(GRID, variables: { username: "rita", after: first.dig("posts", "pageInfo", "endCursor") }).dig("data", "user", "posts")
    assert_equal [ "P0" ], rest["edges"].map { _1.dig("node", "name") }
    assert_not rest.dig("pageInfo", "hasNextPage")
  end

  test "an email stays visible only to the user and admins" do
    query = "query($username: String!) { user(by: { username: $username }) { email } }"
    variables = { username: "alice" }

    assert_nil gql(query, variables: variables).dig("data", "user", "email")
    assert_nil gql(query, as: users(:reader), variables: variables).dig("data", "user", "email")
    assert_equal "author@example.com", gql(query, as: users(:author), variables: variables).dig("data", "user", "email")
    assert_equal "author@example.com", gql(query, as: users(:admin), variables: variables).dig("data", "user", "email")
  end

  test "pages share the site's address, to build links to share" do
    inertia_visit :get, "/"
    assert_equal "http://www.example.com", inertia_page.dig("props", "site_url")

    ENV["APP_URL"] = "https://blog.example.com/"
    inertia_visit :get, "/"
    assert_equal "https://blog.example.com", inertia_page.dig("props", "site_url")
  ensure
    ENV.delete("APP_URL")
  end

  test "the signed-in user knows their own username" do
    sign_in_as users(:author)
    inertia_visit :get, "/"
    assert_equal "alice", inertia_page.dig("props", "auth", "user", "username")
  end

  test "authors, posts and comments link to the user's page" do
    inertia_visit :get, "/"
    author = page_query.dig("data", "posts", "edges").map { _1["node"] }.find { _1["name"] == "Admin post" }["author"]
    assert_equal "adam", author["username"]
  end

  test "a user is found by exactly one of id or username (UserBy is @oneOf)" do
    query = "query($by: UserBy!) { user(by: $by) { username } }"
    alice = users(:author)

    assert_equal "alice", gql(query, variables: { by: { username: "alice" } }).dig("data", "user", "username")
    assert_equal "alice", gql(query, variables: { by: { id: alice.to_gid_param } }).dig("data", "user", "username")
    assert_nil gql(query, variables: { by: { username: "nobody" } }).dig("data", "user")

    [ { id: alice.to_gid_param, username: "alice" }, {}, { username: nil } ].each do |by|
      result = gql(query, variables: { by: by })
      assert_nil result["data"], "#{by.inspect} should be refused before anything resolves"
      assert_match(/invalid value/, result.dig("errors", 0, "message"))
    end
  end
end
