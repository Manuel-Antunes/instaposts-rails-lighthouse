require "test_helper"

# A refused operation says why in extensions.code, as Apollo names it: the frontend tells an
# ended session (LoadMoreError reloads the page, and the controller sends to sign in) from a
# failure to retry without matching the message.
class GraphqlRefusalsTest < ActionDispatch::IntegrationTest
  def first_error(result) = result.dig("errors", 0).slice("message", "extensions")

  test "a guest at a field that needs a user: UNAUTHENTICATED" do
    assert_equal({ "message" => "Unauthenticated.", "extensions" => { "code" => "UNAUTHENTICATED" } },
                 first_error(gql("query Admins { users(first: 1) { edges { node { id } } } }")))
  end

  test "a user the policy refuses: FORBIDDEN" do
    result = gql("query Trash { posts(first: 1, trashed: ONLY) { edges { node { id } } } }", as: users(:author))
    assert_equal({ "message" => "This action is unauthorized.", "extensions" => { "code" => "FORBIDDEN" } }, first_error(result))
  end

  test "a model that refuses the input keeps its validation messages" do
    result = gql('mutation { createPost(input: { name: "", content: "c" }) { id } }', as: users(:author))
    assert_equal [ "Name can't be blank" ], result.dig("errors", 0, "extensions", "validation", "input.name")
  end
end
