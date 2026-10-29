require "test_helper"

module PageQueries
  class ViteSourceTest < ActiveSupport::TestCase
    FakeConfig = Struct.new(:manifest_paths, :auto_build, :origin)
    FakeVite = Struct.new(:config, :dev_server_running) do
      def dev_server_running? = dev_server_running
    end

    test "reads the pages and operations the plugin added to the Vite manifest" do
      Dir.mktmpdir do |dir|
        manifest = Pathname(dir).join("manifest.json")
        manifest.write(JSON.generate(
          "pages/posts/show.tsx" => { "file" => "assets/show.js", "inertia" => { "component" => "posts/show", "pageQuery" => "PostShowPage" },
                                      "graphql" => { "version" => 1, "operations" => { "PostShowPage" => { "type" => "query" } } } },
          "pages/posts/new.tsx" => { "file" => "assets/new.js", "inertia" => { "component" => "posts/new", "pageQuery" => nil },
                                     "graphql" => { "version" => 1, "operations" => {} } },
          "_shared.js" => { "file" => "assets/shared.js", "graphql" => { "version" => 1, "operations" => { "LikePost" => { "type" => "mutation" } } } },
          "entrypoints/inertia.tsx" => { "file" => "assets/inertia.js", "isEntry" => true }
        ))
        source = ViteSource.new(FakeVite.new(FakeConfig.new([ manifest ], false), false))

        assert_equal({ "version" => 1, "pages" => { "posts/show" => "PostShowPage", "posts/new" => nil },
                       "operations" => { "PostShowPage" => { "type" => "query" }, "LikePost" => { "type" => "mutation" } } }, source.read)
        assert_equal [ [ manifest.to_s, manifest.mtime ] ], source.stamp
      end
    end

    test "without a manifest it says to build" do
      source = ViteSource.new(FakeVite.new(FakeConfig.new([], false), false))
      assert_match "bin/vite build", assert_raises(ManifestError) { source.read }.message
    end
  end
end
