require "test_helper"

class PostTest < ActiveSupport::TestCase
  test "requires an author" do
    post = Post.new(name: "Title", content: "Body")
    assert_not post.valid?
    assert post.errors.of_kind?(:author, :blank)
  end
end
