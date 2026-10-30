require "test_helper"

# Posts go to the trash (Discard) and come back or go for good through Lighthouse's
# @softDeletes / @restore / @forceDelete.
class SoftDeletesTest < ActionDispatch::IntegrationTest
  DELETE = "mutation($id: ID!) { deletePost(id: $id) { name deletedAt } }".freeze
  RESTORE = "mutation($id: ID!) { restorePost(id: $id) { name deletedAt } }".freeze
  FORCE_DELETE = "mutation($id: ID!) { forceDeletePost(id: $id) { name } }".freeze

  def names(trashed: nil, as: nil)
    args = trashed ? ", trashed: #{trashed}" : ""
    result = gql("{ posts(first: 50#{args}) { edges { node { name } } } }", as: as)
    result["errors"] ? result.dig("errors", 0, "message") : result.dig("data", "posts", "edges").map { _1.dig("node", "name") }.sort
  end

  test "its author moves a post to the trash, and it is gone from everywhere" do
    post = posts(:two)
    result = gql(DELETE, as: users(:author), variables: { id: post.to_gid_param })
    assert_equal "Second", result.dig("data", "deletePost", "name")
    assert result.dig("data", "deletePost", "deletedAt")

    assert post.reload.discarded?
    assert_equal [ "Admin post", "First" ], names
    assert_nil gql("query($id: ID!) { post(id: $id) { name } }", variables: { id: post.to_gid_param }).dig("data", "post")
    assert_nil gql("query($id: ID!) { node(id: $id) { id } }", as: users(:admin), variables: { id: post.to_gid_param }).dig("data", "node")
    get "/posts/#{post.id}"
    assert_response :not_found
  end

  test "an admin trashes any post; nobody else does" do
    assert_equal "This action is unauthorized.", gql(DELETE, as: users(:reader), variables: { id: posts(:one).to_gid_param }).dig("errors", 0, "message")
    assert_equal "Unauthenticated.", gql(DELETE, variables: { id: posts(:one).to_gid_param }).dig("errors", 0, "message")
    assert_nil gql(DELETE, as: users(:admin), variables: { id: posts(:one).to_gid_param })["errors"]
  end

  test "only admins list the trash" do
    posts(:two).discard!

    assert_equal [ "Second" ], names(trashed: "ONLY", as: users(:admin))
    assert_equal [ "Admin post", "First", "Second" ], names(trashed: "WITH", as: users(:admin))
    assert_equal [ "Admin post", "First" ], names(trashed: "WITHOUT", as: users(:admin))
    # Without the argument, anyone lists the live posts; with it, whatever its value, only
    # admins (@softDeletes(ability: "view_trashed")).
    assert_equal [ "Admin post", "First" ], names
    [ nil, users(:reader), users(:author) ].each do |user|
      %w[ONLY WITH WITHOUT].each { assert_equal "This action is unauthorized.", names(trashed: _1, as: user) }
    end
  end

  test "a trashed post takes no likes or comments" do
    posts(:two).discard!
    id = posts(:two).to_gid_param

    assert_equal "Post not found.", gql("mutation($id: ID!) { likePost(id: $id) { id } }", as: users(:reader), variables: { id: id }).dig("errors", 0, "message")
    result = gql("mutation($id: ID!) { createComment(input: { postId: $id, body: \"x\" }) { id } }", as: users(:reader), variables: { id: id })
    assert_equal [ "Post must exist" ], result.dig("errors", 0, "extensions", "validation", "post")
  end

  test "admins restore a trashed post" do
    posts(:two).discard!
    id = posts(:two).to_gid_param

    assert_equal "This action is unauthorized.", gql(RESTORE, as: users(:author), variables: { id: id }).dig("errors", 0, "message")
    assert_equal({ "name" => "Second", "deletedAt" => nil }, gql(RESTORE, as: users(:admin), variables: { id: id }).dig("data", "restorePost"))
    assert_includes names, "Second"
  end

  test "admins delete a trashed post for good, with its likes and comments" do
    post = posts(:one)
    post.discard!

    assert_equal "This action is unauthorized.", gql(FORCE_DELETE, as: users(:author), variables: { id: post.to_gid_param }).dig("errors", 0, "message")
    assert_difference [ "Comment.count", "Like.count" ], -2 do
      assert_equal "First", gql(FORCE_DELETE, as: users(:admin), variables: { id: post.to_gid_param }).dig("data", "forceDeletePost", "name")
    end
    assert_not Post.with_discarded.exists?(post.id)
  end

  test "the trash page preloads the trashed posts, for admins" do
    posts(:two).discard!

    sign_in_as users(:admin)
    inertia_visit :get, "/admin/posts"
    assert_equal "TrashPage", inertia_page.dig("props", "page_query", "operation")
    assert_equal [ "Second" ], inertia_page.dig("props", "page_query", "data", "posts", "edges").map { _1.dig("node", "name") }

    sign_in_as users(:author)
    get "/admin/posts"
    assert_redirected_to root_path
  end
end
