class AddConfirmedAtToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :confirmed_at, :datetime

    # A provider vouched for the email of users who signed in with one. Users who only
    # registered with a password never proved theirs: they confirm it from now on.
    execute <<~SQL
      UPDATE users SET confirmed_at = CURRENT_TIMESTAMP
      WHERE EXISTS (SELECT 1 FROM accounts WHERE accounts.user_id = users.id)
    SQL
  end

  def down
    remove_column :users, :confirmed_at
  end
end
