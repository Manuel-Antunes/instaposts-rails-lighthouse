class ApplicationController < ActionController::Base
  include Pundit::Authorization
  # Files on a Disk service (tests) need the request's host for their URLs.
  include ActiveStorage::SetCurrent

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # current_user, sign_in and the rest are Devise's (config/initializers/devise.rb). /graphql
  # also takes a bearer JWT (see GraphqlController).
end
