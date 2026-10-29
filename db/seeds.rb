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
  end.admin!
else
  puts "Skipping the admin user: set SEED_ADMIN_PASSWORD to seed it in production."
end
