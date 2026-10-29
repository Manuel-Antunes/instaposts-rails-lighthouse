# frozen_string_literal: true

InertiaRails.configure do |config|
  config.version = ViteRuby.digest
  config.encrypt_history = true
  config.always_include_errors_hash = true
  config.use_script_element_for_initial_page = true
  config.use_data_inertia_head_attribute = true
  config.server_head = true
  config.convert_fragment_redirects = true

  # Not in tests: they would need a Node process; they check the props and the HTML without it.
  config.ssr_enabled = !Rails.env.test?
  config.ssr_bundle = Rails.root.join("public/vite-ssr/ssr.js").to_s

  # In development leave ssr_url unset: pages are rendered by the Vite dev server
  # (/__inertia_ssr), which is found automatically. In production it is the Node
  # server started by bin/docker-entrypoint.
  config.ssr_url = ENV.fetch("INERTIA_SSR_URL", "http://127.0.0.1:13714") if Rails.env.production?
end
