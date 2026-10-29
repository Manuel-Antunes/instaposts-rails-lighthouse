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
end
