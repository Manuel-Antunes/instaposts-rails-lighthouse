require "test_helper"

class PostPolicyTest < ActiveSupport::TestCase
  test "everyone can read posts, guests included" do
    [ nil, users(:reader), users(:author), users(:admin) ].each do |user|
      assert PostPolicy.new(user, Post).index?
      assert PostPolicy.new(user, posts(:one)).show?
    end
  end

  test "authors and admins can create posts" do
    assert PostPolicy.new(users(:author), Post).create?
    assert PostPolicy.new(users(:admin), Post).create?
  end

  test "readers and guests cannot create posts" do
    assert_not PostPolicy.new(users(:reader), Post).create?
    assert_not PostPolicy.new(nil, Post).create?
  end

  test "anyone signed in can like a post" do
    assert PostPolicy.new(users(:reader), posts(:one)).like?
    assert_not PostPolicy.new(nil, posts(:one)).like?
  end

  test "writing waits for a confirmed email" do
    unconfirmed = User.create!(name: "New", email: "new@example.com", password: "s3cret-pass", role: :author)
    assert_not PostPolicy.new(unconfirmed, Post).create?
    assert_not PostPolicy.new(unconfirmed, posts(:one)).like?
    assert_not CommentPolicy.new(unconfirmed, Comment).create?
  end

  test "its author or an admin trashes a post; only admins see, restore or purge the trash" do
    assert PostPolicy.new(users(:author), posts(:one)).destroy?
    assert PostPolicy.new(users(:admin), posts(:one)).destroy?
    assert_not PostPolicy.new(users(:reader), posts(:one)).destroy?

    %i[trash? restore? force_delete?].each do |ability|
      assert PostPolicy.new(users(:admin), Post).public_send(ability)
      assert_not PostPolicy.new(users(:author), Post).public_send(ability)
    end
  end

  test "listing trashed posts is for admins" do
    assert_not PostPolicy.new(nil, Post).view_trashed?
    assert_not PostPolicy.new(users(:author), Post).view_trashed?
    assert PostPolicy.new(users(:admin), Post).view_trashed?
  end
end
