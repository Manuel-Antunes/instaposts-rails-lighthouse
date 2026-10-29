module Resolvers
  class Me < BaseResolver
    def resolve = context[:current_user]
  end
end
