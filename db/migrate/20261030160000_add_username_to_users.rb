# Every user gets a @username, unique and lowercase: their public page is /@username.
# Existing users get one from their email, with a number when two start the same.
class AddUsernameToUsers < ActiveRecord::Migration[8.1]
  class MigrationUser < ActiveRecord::Base
    self.table_name = "users"
  end

  def up
    add_column :users, :username, :string

    MigrationUser.reset_column_information
    taken = Set.new
    MigrationUser.order(:id).find_each do |user|
      base = user.email.to_s.split("@").first.to_s.downcase.gsub(/[^a-z0-9_.]/, "_").gsub(/\.{2,}/, ".").sub(/\A\.+/, "")
      base = base[0, 30].sub(/\.+\z/, "").presence || "user"

      candidate = base
      (1..).each do |n|
        break unless taken.include?(candidate)

        candidate = "#{base[0, 30 - n.to_s.length].sub(/\.+\z/, '')}#{n}"
      end
      taken << candidate
      user.update_columns(username: candidate)
    end

    change_column_null :users, :username, false
    add_index :users, :username, unique: true
  end

  def down
    remove_index :users, :username
    remove_column :users, :username
  end
end
