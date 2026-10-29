require "test_helper"

class LikeTest < ActiveSupport::TestCase
  test "a user likes a post once" do
    like = Like.new(user: users(:reader), post: posts(:one))
    assert_not like.valid?
    assert like.errors.of_kind?(:user_id, :taken)
  end

  test "the post counts its likes" do
    post = posts(:two)
    assert_difference -> { post.reload.likes_count }, 1 do
      Like.create!(user: users(:reader), post: post)
    end
    assert_difference -> { post.reload.likes_count }, -1 do
      post.likes.first.destroy!
    end
  end
end
