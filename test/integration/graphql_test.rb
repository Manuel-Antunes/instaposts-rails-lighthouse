require "test_helper"

class GraphqlTest < ActionDispatch::IntegrationTest
  ME_POSTS = <<~GQL
    query { me { name email role posts(first: 1) { edges { node { name } cursor } pageInfo { hasNextPage } } } }
  GQL

  CREATE_POST = <<~GQL
    mutation { createPost(input: { name: "Hello", content: "World" }) { name author { name } } }
  GQL

  def gql(query, as: nil)
    headers = as ? { "Authorization" => "Bearer #{AuthToken.encode(as)}" } : {}
    post "/graphql", params: { query: query }, headers: headers, as: :json
    response.parsed_body
  end

  test "me is null without a valid JWT" do
    assert_nil gql(ME_POSTS).dig("data", "me")

    post "/graphql", params: { query: ME_POSTS }, headers: { "Authorization" => "Bearer nope" }, as: :json
    assert_nil response.parsed_body.dig("data", "me")
  end

  test "an expired JWT is rejected" do
    token = AuthToken.encode(users(:author), expires_in: -1.minute)
    post "/graphql", params: { query: ME_POSTS }, headers: { "Authorization" => "Bearer #{token}" }, as: :json
    assert_nil response.parsed_body.dig("data", "me")
  end

  test "me resolves the signed-in user with a paginated posts connection" do
    me = gql(ME_POSTS, as: users(:author)).dig("data", "me")

    assert_equal "Alice Author", me["name"]
    assert_equal "author@example.com", me["email"]
    assert_equal "AUTHOR", me["role"]
    assert_equal 1, me.dig("posts", "edges").size
    assert me.dig("posts", "pageInfo", "hasNextPage")
  end

  test "me.posts only holds the user's own posts" do
    posts = gql("{ me { posts(first: 10) { edges { node { name } } } } }", as: users(:admin))
    assert_equal [ "Admin post" ], posts.dig("data", "me", "posts", "edges").map { _1.dig("node", "name") }
  end

  test "everyone can list posts, guests included" do
    result = gql("{ posts(first: 10) { edges { node { name author { name } } } } }")
    assert_nil result["errors"]
    assert_equal 3, result.dig("data", "posts", "edges").size
  end

  test "posts only lists active posts" do
    posts(:two).update!(active: false)

    names = gql("{ posts(first: 10) { edges { node { name } } } }").dig("data", "posts", "edges").map { _1.dig("node", "name") }
    assert_equal [ "Admin post", "First" ], names.sort
  end

  test "email is hidden from other users but visible to admins" do
    query = %({ posts(first: 10) { edges { node { author { name email } } } } })
    emails = ->(result) { result.dig("data", "posts", "edges").map { _1.dig("node", "author", "email") }.compact }

    assert_empty emails.call(gql(query))
    assert_empty emails.call(gql(query, as: users(:reader)))
    assert_equal %w[admin@example.com author@example.com], emails.call(gql(query, as: users(:admin))).uniq.sort
  end

  test "an author can create a post and becomes its author" do
    assert_difference "Post.count", 1 do
      result = gql(CREATE_POST, as: users(:author))
      assert_equal({ "name" => "Hello", "author" => { "name" => "Alice Author" } }, result.dig("data", "createPost"))
    end
  end

  test "an admin can create a post" do
    assert_difference "Post.count", 1 do
      assert_nil gql(CREATE_POST, as: users(:admin))["errors"]
    end
  end

  test "a reader cannot create a post" do
    assert_no_difference "Post.count" do
      assert_equal "This action is unauthorized.", gql(CREATE_POST, as: users(:reader)).dig("errors", 0, "message")
    end
  end

  test "a guest cannot create a post" do
    assert_no_difference "Post.count" do
      assert_equal "Unauthenticated.", gql(CREATE_POST).dig("errors", 0, "message")
    end
  end
end
