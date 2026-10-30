# frozen_string_literal: true

# Lighthouse builds the schema from the SDL in graphql/schema.graphql, on the classes graphql-ruby's
# install wrote (base_types): the SDL's root types extend the code-first ones, whose
# `field`s stay the schema's, and every type, resolver and mutation class inherits from
# its kind's base. The rest of the class is graphql-ruby's.
class BlogRailsSchema < Lighthouse::GraphQL::RbLightHouse.get_schema(
  options: {
    base_types: {
      query_type: Types::QueryType,
      mutation_type: Types::MutationType,
      node: Types::NodeType,
      resolver: Resolvers::BaseResolver,
      mutation: Mutations::BaseMutation,
      object: Types::BaseObject,
      interface: Types::BaseInterface,
      union: Types::BaseUnion,
      scalar: Types::BaseScalar,
      enum: Types::BaseEnum,
      input_object: Types::BaseInputObject
    }
  }
)
  # For batch-loading (see https://graphql-ruby.org/dataloader/overview.html)
  use GraphQL::Dataloader

  # GraphQL-Ruby calls this when something goes wrong while running a query:
  def self.type_error(err, context)
    # if err.is_a?(GraphQL::InvalidNullError)
    #   # report to your bug tracker here
    #   return nil
    # end
    super
  end

  # Limit the depth and size of incoming queries:
  max_depth(15)
  max_query_string_tokens(5000)

  # Stop validating when it encounters this many errors:
  validate_max_errors(100)

  # Relay-style Object Identification:

  # Return a string UUID for `object`
  def self.id_from_object(object, type_definition, query_ctx)
    # For example, use Rails' GlobalID library (https://github.com/rails/globalid):
    object.to_gid_param
  end

  # Given a string UUID, find the object, under its model's default scope: Query.node
  # finds no trashed post. (GlobalID.find skips default scopes. @globalId(decode:) reads
  # the id from the GlobalID without coming here.)
  def self.object_from_id(global_id, query_ctx)
    gid = GlobalID.parse(global_id)
    gid&.model_class&.find_by(id: gid.model_id)
  rescue NameError
    nil
  end
end
