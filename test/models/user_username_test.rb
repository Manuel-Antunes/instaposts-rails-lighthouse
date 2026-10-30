require "test_helper"

# The @username of a user: Instagram's format, lowercase, one per person.
class UserUsernameTest < ActiveSupport::TestCase
  def user(**attributes) = User.new({ name: "Jane", email: "jane@example.com", password: "s3cret-pass" }.merge(attributes))

  test "letters, numbers, underscores and periods, up to 30" do
    %w[a ana ana_souza ana.souza a1 _ana ana_ 1ana x.y.z].push("a" * 30).each do |username|
      assert user(username: username).valid?, "#{username} should be valid"
    end
  end

  test "nothing else: symbols, spaces, two periods, a period at the ends, too long" do
    [ "ana souza", "ana-souza", "ana@souza", "ana!", "ana..souza", "ana.", ".ana", "ünï", "a" * 31 ].each do |username|
      candidate = user(username: username)
      assert_not candidate.valid?, "#{username.inspect} should not be valid"
      assert candidate.errors[:username].any?
    end
  end

  test "is always lowercase, and without blanks around" do
    assert_equal "ana.souza", user(username: "  Ana.Souza ").tap(&:valid?).username
  end

  test "is unique, whatever the case" do
    duplicate = user(username: "Alice")
    assert_not duplicate.valid?
    assert duplicate.errors.of_kind?(:username, :taken)
  end

  test "whoever picks none gets one from their email" do
    assert_equal "jane", user.tap(&:valid?).username
    assert_equal "jane.doe", user(email: "Jane.Doe@example.com").tap(&:valid?).username
    assert_equal "jane_doe", user(email: "jane+doe@example.com").tap(&:valid?).username
  end

  test "a username that is taken gets a number" do
    User.create!(name: "A", email: "ana@one.example", password: "s3cret-pass")
    assert_equal "ana1", user(email: "ana@two.example").tap(&:valid?).username

    User.create!(name: "A", email: "ana@two.example", password: "s3cret-pass")
    assert_equal "ana2", user(email: "ana@three.example").tap(&:valid?).username
  end

  test "available_username makes a valid one out of anything" do
    {
      "Ana Souza" => "ana_souza", "a..b." => "a.b", "..." => "user", "" => "user", nil => "user",
      "alice" => "alice1", "Ünï.cødé" => "_n_.c_d_"
    }.each do |seed, expected|
      assert_equal expected, User.available_username(seed)
      assert_match User::USERNAME_FORMAT, User.available_username(seed)
    end
    assert_equal 30, User.available_username("x" * 40).size
  end

  test "a number never pushes it past 30 or leaves a period at the end" do
    base = "#{'a' * 28}.b"
    User.create!(name: "A", email: "#{base}@one.example", password: "s3cret-pass", username: base[0, 30])

    taken = User.available_username(base)
    assert_operator taken.size, :<=, 30
    assert_match User::USERNAME_FORMAT, taken
  end

  test "an OAuth2 user gets the nickname the provider gives" do
    auth = OmniAuth::AuthHash.new(provider: "github", uid: "u1", info: { email: "octo@example.com", name: "Octo Cat", nickname: "OctoCat" })
    assert_equal "octocat", User.from_omniauth(auth).username

    other = OmniAuth::AuthHash.new(provider: "github", uid: "u2", info: { email: "other@example.com", name: "Other", nickname: "octocat" })
    assert_equal "octocat1", User.from_omniauth(other).username
  end
end
