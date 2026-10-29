# Posts go to the trash (discard) instead of being switched off: an inactive post
# becomes a discarded one, as of its last update.
class ReplaceActiveWithDiscardedAtOnPosts < ActiveRecord::Migration[8.1]
  def up
    add_column :posts, :discarded_at, :datetime
    add_index :posts, :discarded_at
    execute "UPDATE posts SET discarded_at = updated_at WHERE active = FALSE OR active IS NULL"
    remove_column :posts, :active
  end

  def down
    add_column :posts, :active, :boolean
    execute "UPDATE posts SET active = (discarded_at IS NULL)"
    remove_index :posts, :discarded_at
    remove_column :posts, :discarded_at
  end
end
