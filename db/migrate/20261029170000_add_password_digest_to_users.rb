class AddPasswordDigestToUsers < ActiveRecord::Migration[8.1]
  def change
    # Null for users who only sign in through OAuth2.
    add_column :users, :password_digest, :string
  end
end
