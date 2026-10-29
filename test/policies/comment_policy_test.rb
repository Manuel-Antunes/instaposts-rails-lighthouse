require "test_helper"

class CommentPolicyTest < ActiveSupport::TestCase
  test "everyone reads comments, and anyone signed in comments" do
    [ nil, users(:reader), users(:admin) ].each { assert CommentPolicy.new(_1, comments(:by_reader)).show? }
    assert CommentPolicy.new(users(:reader), Comment).create?
    assert_not CommentPolicy.new(nil, Comment).create?
  end

  test "only its author edits a comment" do
    comment = comments(:by_reader)
    assert CommentPolicy.new(users(:reader), comment).update?
    assert_not CommentPolicy.new(users(:author), comment).update?
    assert_not CommentPolicy.new(users(:admin), comment).update?
    assert_not CommentPolicy.new(nil, comment).update?
  end

  test "its author, the post's author and admins delete a comment" do
    comment = comments(:by_reader) # on posts(:one), by users(:author)
    assert CommentPolicy.new(users(:reader), comment).destroy?
    assert CommentPolicy.new(users(:author), comment).destroy?
    assert CommentPolicy.new(users(:admin), comment).destroy?

    stranger = User.create!(name: "Stranger", email: "stranger@example.com")
    assert_not CommentPolicy.new(stranger, comment).destroy?
    assert_not CommentPolicy.new(nil, comment).destroy?
  end
end
