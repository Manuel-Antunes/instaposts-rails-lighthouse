# frozen_string_literal: true

module PageQueries
  # Reads the frontend's GraphQL metadata the way vite_ruby finds assets: from the
  # Vite dev server when it runs, else from the build's manifest, built first when
  # vite_ruby's autoBuild is on (development without the dev server, tests).
  class ViteSource
    DEV_ENDPOINT = "/__inertia_graphql"
    TIMEOUT = 5

    def initialize(vite = ViteRuby.instance)
      @vite = vite
    end

    # Changes when the data may have: the manifests' mtimes. nil from the dev
    # server, which is asked every time.
    def stamp
      return nil if @vite.dev_server_running?

      build if @vite.config.auto_build
      @vite.config.manifest_paths.map { [ _1.to_s, _1.mtime ] }
    end

    # `{ "version", "pages", "operations" }`.
    def read
      @vite.dev_server_running? ? from_dev_server : from_manifest
    end

    def rebuild_hint
      if @vite.dev_server_running?
        "is the inertia-graphql plugin in vite.config.ts?"
      else
        "rebuild the frontend (bin/vite build)"
      end
    end

    private

    def build
      @vite.builder.build || raise(ManifestError, "The Vite build failed; see the log above")
    end

    def from_manifest
      paths = @vite.config.manifest_paths
      raise ManifestError, "There is no Vite manifest: #{rebuild_hint}" if paths.empty?

      entries = paths.map { JSON.parse(_1.read) }.inject({}, &:merge)
      raw = { "version" => nil, "pages" => {}, "operations" => {} }
      entries.each_value do |entry|
        if (inertia = entry["inertia"])
          raw["pages"][inertia.fetch("component")] = inertia["pageQuery"]
        end
        if (graphql = entry["graphql"])
          raw["version"] = graphql["version"]
          raw["operations"].merge!(graphql.fetch("operations"))
        end
      end
      raw
    end

    def from_dev_server
      uri = URI.join(@vite.config.origin, DEV_ENDPOINT)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: TIMEOUT, read_timeout: TIMEOUT) do |http|
        http.get(uri.request_uri)
      end
      raise ManifestError, "#{uri} answered #{response.code}: #{rebuild_hint}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue SystemCallError, Net::OpenTimeout, Net::ReadTimeout, JSON::ParserError => e
      raise ManifestError, "Could not read #{uri}: #{e.message}"
    end
  end
end
