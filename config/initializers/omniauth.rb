# Providers are enabled by the presence of their credentials; :developer (a form
# that takes any name and email) is for local development only.
# Callback URLs to register with each provider: <host>/auth/<provider>/callback.
providers = []
providers << :google_oauth2 if ENV["GOOGLE_CLIENT_ID"].present?
providers << :github if ENV["GITHUB_CLIENT_ID"].present?
providers << :developer if Rails.env.development?

Rails.application.config.x.omniauth_providers = providers

Rails.application.config.middleware.use OmniAuth::Builder do
  if providers.include?(:google_oauth2)
    provider :google_oauth2, ENV.fetch("GOOGLE_CLIENT_ID"), ENV.fetch("GOOGLE_CLIENT_SECRET"),
             scope: "email,profile"
  end

  if providers.include?(:github)
    provider :github, ENV.fetch("GITHUB_CLIENT_ID"), ENV.fetch("GITHUB_CLIENT_SECRET"),
             scope: "user:email"
  end

  provider :developer if providers.include?(:developer)
end

# The request phase only accepts POST with a valid Rails CSRF token (that is what
# omniauth-rails_csrf_protection configures, so request_validation_phase is left alone).
OmniAuth.config.allowed_request_methods = %i[post]

# Callback URLs are built from this instead of the (forgeable) Host header.
# Set it in production, e.g. APP_URL=https://blog.example.com.
OmniAuth.config.full_host = ENV["APP_URL"] if ENV["APP_URL"].present?
