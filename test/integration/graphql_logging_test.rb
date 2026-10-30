require "test_helper"

# Operations answered with errors are warnings in the log (config/initializers/lighthouse.rb):
# what an error tracker or a log search finds a refused or failing client by.
class GraphqlLoggingTest < ActionDispatch::IntegrationTest
  # The warnings logged while the block runs.
  def warnings
    io = StringIO.new
    original = Rails.logger
    Rails.logger = ActiveSupport::Logger.new(io)
    yield
    io.string.lines.map(&:strip).grep(/answered with errors/)
  ensure
    Rails.logger = original
  end

  test "a refused operation is a warning with its name and the message, never its variables" do
    lines = warnings do
      gql("query Admins($after: String) { users(first: 1, after: $after) { edges { node { id } } } }", variables: { after: "private-cursor" })
    end

    assert_equal [ "GraphQL Admins answered with errors: Unauthenticated." ], lines
    assert_no_match(/private-cursor/, lines.join)
  end

  test "each operation of a batch is logged under its own name" do
    lines = warnings do
      post "/graphql", params: { _json: [ { query: "query Mine { me { id } }" }, { query: "query Everyone { users(first: 1) { edges { node { id } } } }" } ] }, as: :json
    end

    assert_equal [ "GraphQL Mine answered with errors: Unauthenticated.", "GraphQL Everyone answered with errors: Unauthenticated." ], lines
  end

  test "an operation answered without errors is not" do
    assert_empty(warnings { gql("query Feed { posts(first: 1) { edges { node { id } } } }") })
  end
end
