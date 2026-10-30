# From has_secure_password and hand-written confirmation to Devise. Both hash with
# bcrypt, so password_digest becomes encrypted_password as it is: nobody resets anything.
class MoveUsersToDevise < ActiveRecord::Migration[8.1]
  def up
    rename_column :users, :password_digest, :encrypted_password
    change_column_default :users, :encrypted_password, ""
    execute "UPDATE users SET encrypted_password = '' WHERE encrypted_password IS NULL" # OAuth2-only users
    change_column_null :users, :encrypted_password, false

    change_table :users, bulk: true do |t|
      # Recoverable
      t.string :reset_password_token
      t.datetime :reset_password_sent_at
      # Rememberable
      t.datetime :remember_created_at
      # Trackable
      t.integer :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string :current_sign_in_ip
      t.string :last_sign_in_ip
      # Confirmable (confirmed_at is already there)
      t.string :confirmation_token
      t.datetime :confirmation_sent_at
      t.string :unconfirmed_email
    end
    add_index :users, :reset_password_token, unique: true
    add_index :users, :confirmation_token, unique: true
  end

  def down
    remove_index :users, :confirmation_token
    remove_index :users, :reset_password_token
    change_table :users, bulk: true do |t|
      t.remove :reset_password_token, :reset_password_sent_at, :remember_created_at, :sign_in_count, :current_sign_in_at,
               :last_sign_in_at, :current_sign_in_ip, :last_sign_in_ip, :confirmation_token, :confirmation_sent_at, :unconfirmed_email
    end
    change_column_null :users, :encrypted_password, true
    change_column_default :users, :encrypted_password, nil
    execute "UPDATE users SET encrypted_password = NULL WHERE encrypted_password = ''"
    rename_column :users, :encrypted_password, :password_digest
  end
end
