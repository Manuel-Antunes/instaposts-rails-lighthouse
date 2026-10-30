# The providers are Devise's (config.omniauth in config/initializers/devise.rb), which
# also mounts OmniAuth's middleware. These settings are OmniAuth's own.

# The request phase only accepts POST with a valid Rails CSRF token (that is what
# omniauth-rails_csrf_protection configures, so request_validation_phase is left alone).
OmniAuth.config.allowed_request_methods = %i[post]

# Callback URLs are built from this instead of the (forgeable) Host header.
# Set it in production, e.g. APP_URL=https://blog.example.com.
OmniAuth.config.full_host = ENV["APP_URL"] if ENV["APP_URL"].present?

# Devise clears OmniAuth's prefix when it loads and sets it again when the routes are
# drawn, which Rails does on the first request in development and tests. Set now, the
# same as Devise's (config.omniauth_path_prefix), so a callback that is the first
# request after a boot is still OmniAuth's.
OmniAuth.config.path_prefix = Devise.omniauth_path_prefix
