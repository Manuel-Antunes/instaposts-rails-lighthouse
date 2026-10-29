# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# The first admin. The password is only set when the user is created, so rerunning
# the seeds never resets it. In production there is no default password: set
# SEED_ADMIN_PASSWORD to seed the admin there.
admin_password = ENV["SEED_ADMIN_PASSWORD"].presence || ("@Password123" unless Rails.env.production?)

if admin_password
  User.find_or_create_by!(email: "john@acme.inc") do |user|
    user.name = "John Doe"
    user.password = admin_password
    user.confirmed_at = Time.current
  end.admin!
else
  puts "Skipping the admin user: set SEED_ADMIN_PASSWORD to seed it in production."
end

# Development: enough posts, likes and comments to scroll the feed. Only once there are
# fewer than 30 posts, so rerunning the seeds adds nothing.
if Rails.env.development? && Post.count < 30
  people = [ [ "Ana Souza", "ana@acme.inc" ], [ "Bruno Lima", "bruno@acme.inc" ], [ "Carla Dias", "carla@acme.inc" ],
             [ "Diego Rocha", "diego@acme.inc" ], [ "Elisa Melo", "elisa@acme.inc" ] ].map do |name, email|
    User.find_or_create_by!(email: email) { _1.name = name; _1.role = :author; _1.confirmed_at = Time.current }
  end
  topics = [ "Shipping Rails 8", "Inertia without an API", "GraphQL at the edge", "Weekend in Lisbon", "Coffee rituals",
             "SQLite in production", "Why we SSR", "Apollo cache tips", "A walk by the river", "Hotwire or React?" ]
  sentences = [ "It went better than expected.", "Here is what we learned.", "Small steps, every day.",
                "The details matter more than the plan.", "Would do it again.", "Thoughts welcome below." ]

  40.times do |i|
    post = Post.create!(name: "#{topics[i % topics.size]} ##{i + 1}", content: sentences.sample(3).join(" "),
                        author: people.sample, created_at: (40 - i).hours.ago)
    people.sample(rand(0..people.size)).each { post.likes.create!(user: _1) }
    rand(0..6).times { |n| post.comments.create!(author: people.sample, body: sentences.sample, created_at: post.created_at + (n + 1).minutes) }
  end
end
