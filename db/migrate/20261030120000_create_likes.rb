class CreateLikes < ActiveRecord::Migration[8.1]
  def change
    create_table :likes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :post, null: false, foreign_key: true

      t.timestamps
    end
    # One like per user and post; Like.create_or_find_by! relies on it.
    add_index :likes, %i[post_id user_id], unique: true

    add_column :posts, :likes_count, :integer, null: false, default: 0
  end
end
