# frozen_string_literal: true

# Server-side preloading of each Inertia page's GraphQL operation.
#
# A page declares its operation inline, as `export const pageQuery = graphql(`...`)`.
# The Vite plugin (vite/inertia-graphql) publishes, with the frontend build, which
# operation each page preloads and the executable document of every operation: in
# the Vite manifest, or from the Vite dev server in development. Rails knows no file
# of the frontend: it reads that through vite_ruby (Manifest).
#
# `render_preloaded` (PageQueryRendering) runs the page's operation through Lighthouse
# with the controller's user, the same directives and policies as a request to
# /graphql, and sends the result in the `page_query` prop. The frontend writes it into
# Apollo's cache before the page renders (usePageQuery).
module PageQueries
  # The SDL clients see, which GraphQL Code Generator reads.
  SCHEMA_PATH = Rails.root.join("schema.graphql")

  # The prop the result goes in: a page's own props may not use it.
  PROP = :page_query

  class Error < StandardError; end

  # The build's metadata is missing or out of step: no operations, another version,
  # a page it does not know, or a pageQuery naming an operation it does not have.
  class ManifestError < Error; end

  # The controller passed variables to a page without a pageQuery, or variables
  # the operation does not declare, or left out one it requires.
  class VariablesError < Error; end

  # The operation did not run at all (no `data`): a variable of the wrong type, or
  # a document the schema no longer validates.
  class ExecutionError < Error
    attr_reader :errors

    def initialize(operation_name, errors)
      @errors = errors
      super("#{operation_name} failed: #{errors.map { _1['message'] }.join('; ')}")
    end
  end

  module_function

  def manifest
    @manifest ||= Manifest.new
  end

  # Write the SDL clients see to SCHEMA_PATH, unless it already holds it.
  # Returns whether the file changed.
  def dump_schema(schema = BlogRailsSchema)
    sdl = "#{schema.to_definition.strip}\n"
    return false if SCHEMA_PATH.exist? && SCHEMA_PATH.read == sdl

    SCHEMA_PATH.write(sdl)
    true
  end
end
