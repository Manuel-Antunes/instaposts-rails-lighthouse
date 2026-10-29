require "test_helper"

class LikesTest < ActionDispatch::IntegrationTest
  LIKE = "mutation($id: ID!) { likePost(id: $id) { likesCount viewerHasLiked } }".freeze
  UNLIKE = "mutation($id: ID!) { unlikePost(id: $id) { likesCount viewerHasLiked } }".freeze
  FEED = "{ posts(first: 10) { edges { node { name likesCount viewerHasLiked } } } }".freeze

  test "a signed-in user likes and unlikes a post" do
    post = posts(:two)

    assert_equal({ "likesCount" => 1, "viewerHasLiked" => true }, gql(LIKE, as: users(:reader), variables: { id: post.to_gid_param }).dig("data", "likePost"))
    assert_equal({ "likesCount" => 0, "viewerHasLiked" => false }, gql(UNLIKE, as: users(:reader), variables: { id: post.to_gid_param }).dig("data", "unlikePost"))
    assert_equal 0, post.reload.likes_count
  end

  test "liking twice keeps one like, and unliking without a like changes nothing" do
    post = posts(:one) # already liked by users(:reader)

    assert_no_difference "Like.count" do
      assert_equal 2, gql(LIKE, as: users(:reader), variables: { id: post.to_gid_param }).dig("data", "likePost", "likesCount")
    end
    assert_no_difference "Like.count" do
      assert_equal 0, gql(UNLIKE, as: users(:admin), variables: { id: posts(:two).to_gid_param }).dig("data", "unlikePost", "likesCount")
    end
  end

  test "guests cannot like" do
    assert_no_difference "Like.count" do
      assert_equal "Unauthenticated.", gql(LIKE, variables: { id: posts(:two).to_gid_param }).dig("errors", 0, "message")
    end
  end

  test "the id must belong to a post" do
    assert_equal "Post not found.", gql(LIKE, as: users(:reader), variables: { id: users(:admin).to_gid_param }).dig("errors", 0, "message")
    assert_equal "Post not found.", gql(LIKE, as: users(:reader), variables: { id: "garbage" }).dig("errors", 0, "message")
  end

  test "viewerHasLiked is the viewer's, false for guests" do
    liked = ->(user) { gql(FEED, as: user).dig("data", "posts", "edges").to_h { [ _1.dig("node", "name"), _1.dig("node", "viewerHasLiked") ] } }

    assert_equal({ "First" => true, "Second" => false, "Admin post" => false }, liked.call(users(:reader)))
    assert_equal({ "First" => false, "Second" => false, "Admin post" => false }, liked.call(users(:admin)))
    assert_equal({ "First" => false, "Second" => false, "Admin post" => false }, liked.call(nil))
  end

  test "viewerHasLiked costs one query for the whole list" do
    queries = []
    callback = ->(*, payload) { queries << payload[:sql] if payload[:sql].include?(%("likes")) }
    ActiveSupport::Notifications.subscribed(callback, "sql.active_record") { gql(FEED, as: users(:reader)) }

    assert_equal 1, queries.size
  end
end
