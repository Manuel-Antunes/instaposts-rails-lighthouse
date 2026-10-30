# frozen_string_literal: true

module PageQueries
  # Runs a page's pageQuery with `execute`: a controller's lighthouse_execute, so it runs as a
  # request to /graphql would, as the signed-in user.
  #
  #   preloader = PageQueries::Preloader.new(execute: method(:lighthouse_execute))
  #   preloader.prepare("posts/show", { id: post.to_gid_param }).call
  #   # => { id: "…", operation: "PostShowPage", sha256: "…", variables: { "id" => "…" },
  #   #      data: { "post" => { … } }, errors: nil }
  class Preloader
    def initialize(execute:, manifest: PageQueries.manifest)
      @execute = execute
      @manifest = manifest
    end

    # Check the variables against the page's operation now, and return a lambda
    # that runs it, for a lazy Inertia prop; nil for a page without a pageQuery.
    def prepare(page, variables = {})
      variables = variables.to_h.deep_stringify_keys
      operation = @manifest.page(page)
      if operation.nil?
        raise VariablesError, "#{page} has no pageQuery, so it takes no variables (got #{variables.keys.join(', ')})" if variables.any?

        return nil
      end

      check_variables(page, operation, variables)
      # inertia_rails evaluates a lazy prop with instance_exec on the controller: no self here.
      preloader = self
      -> { preloader.send(:execute, page, operation, variables) }
    end

    private

    def check_variables(page, operation, variables)
      declared = operation.variables.map(&:name)
      unknown = variables.keys - declared
      missing = operation.variables.select(&:required).map(&:name) - variables.compact.keys
      return if unknown.empty? && missing.empty?

      problems = []
      problems << "unknown #{unknown.map { "$#{_1}" }.join(', ')}" if unknown.any?
      problems << "missing #{missing.map { "$#{_1}" }.join(', ')}" if missing.any?
      raise VariablesError, "#{page}: #{operation.name} declares #{declared.map { "$#{_1}" }.join(', ').presence || 'no variables'}; #{problems.join(', ')}"
    end

    def execute(page, operation, variables)
      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      result = ActiveSupport::Notifications.instrument("preload.page_queries", page: page, operation: operation.name) do
        @execute.call(operation.document, variables: variables, operation_name: operation.name)
      end
      # A @throttle answered the request with a 429: there is no page to render.
      raise ThrottledError, "#{operation.name} was throttled" if result.nil?

      log(page, operation, started)

      # No `data` at all: the operation never ran (a variable of the wrong type, a
      # document the schema rejects). Errors next to `data` are the page's to show.
      raise ExecutionError.new(operation.name, result["errors"]) unless result.key?("data")

      # `id` tells the browser whether it already has this result (usePageQuery).
      { id: SecureRandom.uuid, operation: operation.name, sha256: operation.sha256, variables: variables,
        data: result["data"], errors: result["errors"] }
    end

    # The operation and how long it took; never the variables, which may be private. Its
    # errors are logged with every operation's (config/initializers/lighthouse.rb).
    def log(page, operation, started)
      ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000
      Rails.logger.info { format("  PageQuery %s for %s (%.1fms)", operation.name, page, ms) }
    end
  end
end
