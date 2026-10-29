require "test_helper"

class CommentTest < ActiveSupport::TestCase
  test "requires a body, without surrounding blanks" do
    comment = Comment.new(post: posts(:one), author: users(:reader), body: "   ")
    assert_not comment.valid?
    assert comment.errors.of_kind?(:body, :blank)

    comment.body = "  hi  "
    assert comment.valid?
    assert_equal "hi", comment.body
  end

  test "is at most as long as an Instagram comment" do
    comment = Comment.new(post: posts(:one), author: users(:reader), body: "x" * (Comment::MAX_LENGTH + 1))
    assert_not comment.valid?
    assert comment.errors.of_kind?(:body, :too_long)
  end

  test "the post counts its comments" do
    post = posts(:two)
    assert_difference -> { post.reload.comments_count }, 1 do
      post.comments.create!(author: users(:reader), body: "First!")
    end
  end

  test "a user's comments and likes go with them" do
    assert_difference [ "Comment.count", "Like.count" ], -1 do
      users(:reader).destroy!
    end
    assert_equal 1, posts(:one).reload.comments_count
    assert_equal 1, posts(:one).likes_count
  end
end
