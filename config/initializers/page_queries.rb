# frozen_string_literal: true

# In development, keep schema.graphql in step with the SDL: Lighthouse's watch_sdl
# reloads the app when a .graphql file changes, and the Vite dev server regenerates
# the frontend's types when schema.graphql does. Elsewhere it is committed, and
# refreshed with bin/rails graphql:schema:dump.
if Rails.env.development?
  Rails.application.config.to_prepare do
    PageQueries.dump_schema
  rescue StandardError => e
    Rails.logger.error("[page_queries] Could not write #{PageQueries::SCHEMA_PATH}: #{e.message}")
  end
end
