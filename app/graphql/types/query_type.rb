# frozen_string_literal: true

module Types
  class QueryType < Types::BaseObject
    # Query.node and nodes are declared in graphql/schema.graphql; these methods resolve them.
    def node(id:) = visible(context.schema.object_from_id(id, context))

    def nodes(ids:) = ids.map { node(id: _1) }

    private

    # object_from_id finds trashed records, for the mutations that restore them: not here.
    def visible(object) = object.respond_to?(:discarded?) && object.discarded? ? nil : object

    # Add root-level fields here.
    # They will be entry points for queries on your schema.
  end
end
