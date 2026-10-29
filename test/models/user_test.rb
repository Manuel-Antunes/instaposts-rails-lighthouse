require "test_helper"

class UserTest < ActiveSupport::TestCase
  def auth_hash(provider: "github", uid: "42", email: "New@Example.com", name: "New User")
    OmniAuth::AuthHash.new(provider: provider, uid: uid, info: { email: email, name: name, image: "http://img" })
  end

  test "from_omniauth creates a reader with an account" do
    user = User.from_omniauth(auth_hash)

    assert user.persisted?
    assert user.reader?
    assert_equal "new@example.com", user.email
    assert_equal [ [ "github", "42" ] ], user.accounts.pluck(:provider, :uid)
  end

  test "from_omniauth returns the same user on the next sign-in" do
    first = User.from_omniauth(auth_hash)
    assert_no_difference [ "User.count", "Account.count" ] do
      assert_equal first, User.from_omniauth(auth_hash)
    end
  end

  test "from_omniauth links a second provider to the user with the same email" do
    existing = users(:author)

    assert_no_difference "User.count" do
      user = User.from_omniauth(auth_hash(provider: "google_oauth2", uid: "g1", email: existing.email))
      assert_equal existing, user
    end
    assert_equal 1, existing.accounts.count
  end
end
