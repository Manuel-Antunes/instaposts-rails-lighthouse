# frozen_string_literal: true

namespace :graphql do
  namespace :schema do
    desc "Write the executable schema (SDL) that GraphQL Code Generator reads to schema.graphql"
    task dump: :environment do
      path = PageQueries::SCHEMA_PATH.relative_path_from(Rails.root)
      puts PageQueries.dump_schema ? "Wrote #{path}" : "#{path} is up to date"
    end
  end
end
