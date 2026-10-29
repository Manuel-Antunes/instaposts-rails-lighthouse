class AddAuthorToPosts < ActiveRecord::Migration[8.1]
  def change
    # Nullable so posts created before users existed keep loading.
    add_reference :posts, :author, null: true, foreign_key: { to_table: :users }
  end
end
