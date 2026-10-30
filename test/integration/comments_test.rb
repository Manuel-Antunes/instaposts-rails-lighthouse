require "test_helper"

class CommentsTest < ActionDispatch::IntegrationTest
  CREATE = <<~GQL.freeze
    mutation($postId: ID!, $body: String!) {
      createComment(input: { postId: $postId, body: $body }) { body author { name } post { commentsCount } viewerCanUpdate viewerCanDelete }
    }
  GQL
  UPDATE = "mutation($id: ID!, $body: String!) { updateComment(input: { id: $id, body: $body }) { body } }".freeze
  DELETE = "mutation($id: ID!) { deleteComment(id: $id) { id post { commentsCount } } }".freeze

  def comments_of(post, args: "first: 10", as: nil)
    query = "query($id: ID!) { post(id: $id) { comments(#{args}) { edges { node { body viewerCanUpdate viewerCanDelete } } pageInfo { hasNextPage endCursor } } } }"
    gql(query, as: as, variables: { id: post.to_gid_param }).dig("data", "post", "comments")
  end

  test "anyone signed in comments on a post" do
    result = gql(CREATE, as: users(:reader), variables: { postId: posts(:two).to_gid_param, body: "  Lovely  " })

    assert_equal({ "body" => "Lovely", "author" => { "name" => "Rita Reader" }, "post" => { "commentsCount" => 1 },
                   "viewerCanUpdate" => true, "viewerCanDelete" => true }, result.dig("data", "createComment"))
  end

  test "guests cannot comment, and a comment needs a body" do
    assert_no_difference "Comment.count" do
      assert_equal "Unauthenticated.", gql(CREATE, variables: { postId: posts(:two).to_gid_param, body: "x" }).dig("errors", 0, "message")

      result = gql(CREATE, as: users(:reader), variables: { postId: posts(:two).to_gid_param, body: " " })
      assert_equal [ "Body can't be blank" ], result.dig("errors", 0, "extensions", "validation", "input.body")
    end
  end

  test "its author edits a comment" do
    comment = comments(:by_reader)
    assert_equal "Edited", gql(UPDATE, as: users(:reader), variables: { id: comment.to_gid_param, body: "Edited" }).dig("data", "updateComment", "body")
    assert_equal "Edited", comment.reload.body
  end

  test "nobody else edits it, admins and the post's author included" do
    comment = comments(:by_reader)
    [ users(:author), users(:admin) ].each do |user|
      result = gql(UPDATE, as: user, variables: { id: comment.to_gid_param, body: "Hacked" })
      assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
    end
    assert_equal "Nice post", comment.reload.body
  end

  test "its author, the post's author and admins delete a comment" do
    { users(:reader) => :by_reader, users(:author) => :by_admin }.each do |user, name|
      result = gql(DELETE, as: user, variables: { id: comments(name).to_gid_param })
      assert_nil result["errors"]
    end
    assert_equal 0, posts(:one).reload.comments_count

    comment = posts(:two).comments.create!(author: users(:reader), body: "x")
    assert_nil gql(DELETE, as: users(:admin), variables: { id: comment.to_gid_param })["errors"]
  end

  test "others cannot delete a comment" do
    stranger = User.create!(name: "Stranger", email: "stranger@example.com", password: "s3cret-pass")
    assert_no_difference "Comment.count" do
      assert_equal "This action is unauthorized.", gql(DELETE, as: stranger, variables: { id: comments(:by_reader).to_gid_param }).dig("errors", 0, "message")
      assert_equal "Unauthenticated.", gql(DELETE, variables: { id: comments(:by_reader).to_gid_param }).dig("errors", 0, "message")
    end
  end

  test "comments list oldest first, or newest first, and say what the viewer may do" do
    assert_equal [ "Nice post", "Agreed" ], comments_of(posts(:one))["edges"].map { _1.dig("node", "body") }

    newest = comments_of(posts(:one), args: "first: 1, orderBy: [{ column: CREATED_AT, order: DESC }]", as: users(:reader))
    assert_equal [ { "body" => "Agreed", "viewerCanUpdate" => false, "viewerCanDelete" => false } ], newest["edges"].map { _1["node"] }
    assert newest.dig("pageInfo", "hasNextPage")
  end

  test "comments are paginated with cursors" do
    12.times { |i| posts(:two).comments.create!(author: users(:reader), body: "C#{i}", created_at: i.minutes.from_now) }

    first = comments_of(posts(:two))
    assert_equal 10, first["edges"].size
    assert first.dig("pageInfo", "hasNextPage")

    rest = comments_of(posts(:two), args: %(first: 10, after: "#{first.dig('pageInfo', 'endCursor')}"))
    assert_equal %w[C10 C11], rest["edges"].map { _1.dig("node", "body") }
    assert_not rest.dig("pageInfo", "hasNextPage")
  end
end
