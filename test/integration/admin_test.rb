require "test_helper"

class AdminTest < ActionDispatch::IntegrationTest
  USERS = "{ users(first: 10) { edges { node { id name email role } } } }".freeze

  def gql(query, as: nil)
    headers = as ? { "Authorization" => "Bearer #{AuthToken.encode(as)}" } : {}
    post "/graphql", params: { query: query }, headers: headers, as: :json
    response.parsed_body
  end

  def role_mutation(user, role) = %(mutation { updateUserRole(id: "#{user.to_gid_param}", role: #{role}) { name role } })

  test "the admin page is for admins" do
    get "/admin/users"
    assert_redirected_to login_path

    sign_in_as users(:reader)
    get "/admin/users"
    assert_redirected_to root_path

    sign_in_as users(:admin)
    inertia_visit :get, "/admin/users"
    assert_equal "admin/users/index", inertia_page["component"]
  end

  test "only admins can list users" do
    assert_equal "Unauthenticated.", gql(USERS).dig("errors", 0, "message")
    assert_equal "This action is unauthorized.", gql(USERS, as: users(:author)).dig("errors", 0, "message")

    edges = gql(USERS, as: users(:admin)).dig("data", "users", "edges")
    assert_equal User.count, edges.size
    assert_includes edges.map { _1.dig("node", "email") }, "reader@example.com"
  end

  test "an admin can set a user's role" do
    result = gql(role_mutation(users(:author), "READER"), as: users(:admin))

    assert_nil result["errors"]
    assert_equal({ "name" => "Alice Author", "role" => "READER" }, result.dig("data", "updateUserRole"))
    assert users(:author).reload.reader?

    gql(role_mutation(users(:reader), "ADMIN"), as: users(:admin))
    assert users(:reader).reload.admin?
  end

  test "an admin cannot change their own role" do
    result = gql(role_mutation(users(:admin), "READER"), as: users(:admin))

    assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
    assert users(:admin).reload.admin?
  end

  test "non-admins cannot set roles" do
    assert_equal "Unauthenticated.", gql(role_mutation(users(:reader), "ADMIN")).dig("errors", 0, "message")

    result = gql(role_mutation(users(:reader), "ADMIN"), as: users(:author))
    assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
    assert users(:reader).reload.reader?
  end

  test "the id must belong to a user" do
    mutation = %(mutation { updateUserRole(id: "#{posts(:one).to_gid_param}", role: ADMIN) { name } })
    assert_equal "User not found.", gql(mutation, as: users(:admin)).dig("errors", 0, "message")

    mutation = %(mutation { updateUserRole(id: "garbage", role: ADMIN) { name } })
    assert_equal "User not found.", gql(mutation, as: users(:admin)).dig("errors", 0, "message")
  end
end
