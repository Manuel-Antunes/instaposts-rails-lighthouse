require "test_helper"

module PageQueries
  class ManifestTest < ActiveSupport::TestCase
    # A source as ViteSource reads one, from data in the test.
    class FakeSource
      attr_accessor :data, :stamp, :reads

      def initialize(data, stamp: 1)
        @data = data
        @stamp = stamp
        @reads = 0
      end

      def read
        @reads += 1
        @data
      end

      def rebuild_hint = "rebuild"
    end

    OPERATION = {
      "type" => "query", "sha256" => "abc", "document" => "query PostShowPage($id: ID!) { post(id: $id) { name } }",
      "variables" => [ { "name" => "id", "type" => "ID!", "required" => true } ]
    }.freeze

    def data(**overrides)
      { "version" => 1, "pages" => { "posts/show" => "PostShowPage", "posts/new" => nil },
        "operations" => { "PostShowPage" => OPERATION } }.merge(overrides.transform_keys(&:to_s))
    end

    test "a page's operation, with its declared variables" do
      operation = Manifest.new(FakeSource.new(data)).page("posts/show")

      assert_equal "PostShowPage", operation.name
      assert_equal OPERATION["document"], operation.document
      assert_equal [ Manifest::Variable.new(name: "id", type: "ID!", required: true) ], operation.variables
    end

    test "a page without a pageQuery has none" do
      assert_nil Manifest.new(FakeSource.new(data)).page("posts/new")
    end

    test "a page the build does not know, an operation it does not have, another version" do
      error = assert_raises(ManifestError) { Manifest.new(FakeSource.new(data)).page("nope/index") }
      assert_match "nope/index is not a page of the frontend build: rebuild", error.message

      assert_raises(ManifestError) { Manifest.new(FakeSource.new(data(pages: { "posts/show" => "Gone" }))).page("posts/show") }
      assert_raises(ManifestError) { Manifest.new(FakeSource.new(data(version: 2))).page("posts/show") }
    end

    test "rereads only when the source's stamp changes, and every time without one" do
      source = FakeSource.new(data)
      manifest = Manifest.new(source)
      2.times { manifest.page("posts/show") }
      assert_equal 1, source.reads

      source.stamp = 2
      manifest.page("posts/show")
      assert_equal 2, source.reads

      source.stamp = nil
      2.times { manifest.page("posts/show") }
      assert_equal 4, source.reads
    end
  end
end
