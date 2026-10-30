Rails.application.routes.draw do
  # Redirect to localhost from 127.0.0.1 to use same IP address with Vite server
  constraints(host: "127.0.0.1") do
    get "(*path)", to: redirect { |params, req| "#{req.protocol}localhost:#{req.port}/#{params[:path]}" }
  end
  if Rails.env.development?
    mount GraphiQL::Rails::Engine, at: "/graphiql", graphql_path: "/graphql"
  end
  post "/graphql", to: "graphql#execute"

  # Devise, with this app's URLs: /login, /logout and /signup; /password (reset) and
  # /confirmation (email); OmniAuth's POST /auth/:provider and /auth/:provider/callback.
  devise_for :users, path: "", skip: %i[sessions registrations], controllers: {
    passwords: "users/passwords", confirmations: "users/confirmations", omniauth_callbacks: "users/omniauth_callbacks"
  }
  devise_scope :user do
    get "/login", to: "users/sessions#new", as: :new_user_session
    post "/login", to: "users/sessions#create", as: :user_session
    delete "/logout", to: "users/sessions#destroy", as: :destroy_user_session
    get "/signup", to: "users/registrations#new", as: :new_user_registration
    post "/signup", to: "users/registrations#create", as: :user_registration
    # Email and password, from the profile page (Devise asks for the current password).
    patch "/account", to: "users/registrations#update", as: :account
  end

  # Name and picture: the page preloads ProfilePage; saving goes through /graphql (updateProfile).
  resource :profile, only: :show
  # Anyone's public page, at their @username: their picture, and a grid of their posts. The @
  # keeps it apart from every other route, so no username has to be reserved.
  get "/@:username", to: "users#show", as: :user, format: false, constraints: { username: /[A-Za-z0-9_.]{1,30}/ }

  # Search: the page of what the search box finds (?q=), and a #hashtag's posts, at
  # Instagram's addresses. A tag is any letters, so the name takes anything but a slash.
  get "/explore/search", to: "search#index", as: :search
  get "/explore/tags/:name", to: "hashtags#show", as: :hashtag, format: false, constraints: { name: %r{[^/]+} }

  namespace :admin do
    resources :users, only: :index
    # The trash: posts deleted by their authors, to restore or delete for good.
    resources :posts, only: :index
  end

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  resources :posts, only: %i[index show new]
  root "posts#index"
end
