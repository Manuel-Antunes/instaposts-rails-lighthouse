require "test_helper"

# Choosing a username: when signing up, and from the profile.
class UsernamesTest < ActionDispatch::IntegrationTest
  SIGNUP = { name: "Jane Doe", email: "jane@example.com", password: "s3cret-pass", password_confirmation: "s3cret-pass" }.freeze
  PROFILE = "mutation($username: String) { updateProfile(input: { username: $username }) { username } }".freeze

  def sign_up(**overrides) = post("/signup", params: { user: SIGNUP.merge(overrides) }, headers: { "X-Inertia" => "true" })

  test "a person signs up with the username they want, in lowercase" do
    assert_difference "User.count", 1 do
      sign_up(username: "Jane.Doe")
    end
    assert_equal "jane.doe", User.find_by!(email: "jane@example.com").username
  end

  test "left blank, it comes from the email" do
    sign_up
    assert_equal "jane", User.find_by!(email: "jane@example.com").username
  end

  test "a taken or invalid one goes back to the form with the reason" do
    [ [ "alice", "has already been taken" ], [ "ALICE", "has already been taken" ], [ "no spaces", "can only have letters" ], [ "a..b", "can only have letters" ] ].each do |username, reason|
      assert_no_difference "User.count" do
        sign_up(username: username)
      end
      assert_redirected_to new_user_registration_path

      inertia_visit :get, "/signup"
      assert_includes inertia_page.dig("props", "errors", "username").to_s, reason
    end
  end

  test "a user changes theirs from the profile, and their page moves with it" do
    result = gql(PROFILE, as: users(:author), variables: { username: " Alice.Writes " })
    assert_equal "alice.writes", result.dig("data", "updateProfile", "username")

    get "/@alice.writes"
    assert_response :success
    get "/@alice"
    assert_response :not_found
  end

  test "it cannot be one someone has, nor an invalid one" do
    taken = gql(PROFILE, as: users(:author), variables: { username: "Rita" })
    assert_equal [ "Username has already been taken" ], taken.dig("errors", 0, "extensions", "validation", "input.username")

    invalid = gql(PROFILE, as: users(:author), variables: { username: "bad..name" })
    assert_match(/can only have letters/, invalid.dig("errors", 0, "extensions", "validation", "input.username").first)
    assert_equal "alice", users(:author).reload.username
  end

  test "keeping their own username is no conflict" do
    assert_equal "alice", gql(PROFILE, as: users(:author), variables: { username: "Alice" }).dig("data", "updateProfile", "username")
  end
end
