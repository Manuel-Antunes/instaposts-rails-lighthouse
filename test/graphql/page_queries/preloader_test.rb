require "test_helper"

module PageQueries
  class PreloaderTest < ActiveSupport::TestCase
    # A manifest of hand-written operations, run against the real schema.
    class FakeManifest
      def initialize(pages) = @pages = pages

      def page(component)
        raise ManifestError, "unknown #{component}" unless @pages.key?(component)

        @pages[component]
      end
    end

    def operation(name, document, variables = [])
      Manifest::Operation.new(name: name, type: "query", sha256: "sha", document: document,
                              variables: variables.map { Manifest::Variable.new(**_1) })
    end

    def preloader(user = nil)
      manifest = FakeManifest.new(
        "posts/show" => operation("PostShow", "query PostShow($id: ID!) { post(id: $id) { name viewerHasLiked } }",
                                  [ { name: "id", type: "ID!", required: true } ]),
        "posts/feed" => operation("Feed", "query Feed { posts(first: 10) { edges { node { name } } } me { name } }"),
        "posts/new" => nil
      )
      Preloader.new(context: { current_user: user }, manifest: manifest)
    end

    test "runs the page's operation as the context's user" do
      result = preloader(users(:reader)).prepare("posts/show", { id: posts(:one).to_gid_param }).call

      assert_equal "PostShow", result[:operation]
      assert_equal({ "id" => posts(:one).to_gid_param }, result[:variables])
      assert_equal({ "post" => { "name" => "First", "viewerHasLiked" => true } }, result[:data])
      assert_nil result[:errors]
      assert_match(/\A\h{8}-/, result[:id])
    end

    test "each run has an id of its own" do
      query = preloader.prepare("posts/show", { id: posts(:one).to_gid_param })
      assert_not_equal query.call[:id], query.call[:id]
    end

    test "a page without a pageQuery has nothing to preload, and takes no variables" do
      assert_nil preloader.prepare("posts/new")
      assert_raises(VariablesError) { preloader.prepare("posts/new", { id: "1" }) }
    end

    test "variables are checked before anything runs" do
      error = assert_raises(VariablesError) { preloader.prepare("posts/show", { idd: "1" }) }
      assert_equal "posts/show: PostShow declares $id; unknown $idd, missing $id", error.message
      assert_raises(VariablesError) { preloader.prepare("posts/show", { id: nil }) }
    end

    test "an operation that does not run raises, with GraphQL's errors" do
      error = assert_raises(ExecutionError) { preloader.prepare("posts/show", { id: { "not" => "an id" } }).call }
      assert_match "PostShow failed:", error.message
      assert error.errors.any?
    end

    test "errors next to data go to the page" do
      result = preloader.prepare("posts/feed").call

      assert_equal 3, result[:data]["posts"]["edges"].size
      assert_nil result[:data]["me"]
      assert_equal [ "Unauthenticated." ], result[:errors].map { _1["message"] }
    end
  end
end
