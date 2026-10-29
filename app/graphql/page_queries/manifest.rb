# frozen_string_literal: true

module PageQueries
  # The frontend build's GraphQL operations, and the one each Inertia page preloads.
  #
  # The Vite plugin publishes them in two places, read by a ViteSource:
  # - the Vite manifest, where each page's entry carries
  #   `"inertia": { "component": "posts/show", "pageQuery": "PostShowPage" }` and each
  #   chunk's entry the operations its modules declare,
  #   `"graphql": { "version": 1, "operations": { "PostShowPage": { … } } }`;
  # - the Vite dev server, at /__inertia_graphql, as
  #   `{ "version": 1, "pages": { … }, "operations": { … } }`.
  class Manifest
    VERSION = 1

    Variable = Data.define(:name, :type, :required)
    Operation = Data.define(:name, :type, :sha256, :document, :variables)

    def initialize(source = ViteSource.new)
      @source = source
      @state = nil
    end

    # The Operation `component` preloads; nil for a page without a pageQuery.
    def page(component)
      current = state
      pages = current[:pages]
      raise ManifestError, "#{component} is not a page of the frontend build: #{@source.rebuild_hint}" unless pages.key?(component.to_s)

      name = pages[component.to_s]
      name && operation_in(current, name)
    end

    def operation(name) = operation_in(state, name)

    def operations = state[:operations].values

    private

    def operation_in(current, name)
      current[:operations].fetch(name.to_s) do
        raise ManifestError, "The frontend build has no operation #{name}: #{@source.rebuild_hint}"
      end
    end

    # Reread when the source says its data may have changed.
    def state
      stamp = @source.stamp
      current = @state
      return current[:data] if current && !stamp.nil? && current[:stamp] == stamp

      data = normalize(@source.read)
      @state = { stamp: stamp, data: data }
      data
    end

    def normalize(raw)
      version = raw["version"]
      if version != VERSION
        raise ManifestError, "The frontend build's GraphQL metadata has version #{version.inspect}, expected #{VERSION}: #{@source.rebuild_hint}"
      end

      operations = raw.fetch("operations").to_h { |name, op| [ name, operation_from(name, op) ] }
      { pages: raw.fetch("pages"), operations: operations }
    end

    def operation_from(name, op)
      variables = op.fetch("variables").map { Variable.new(name: _1.fetch("name"), type: _1.fetch("type"), required: _1.fetch("required")) }
      Operation.new(name: name, type: op.fetch("type"), sha256: op.fetch("sha256"), document: op.fetch("document"), variables: variables)
    end
  end
end
