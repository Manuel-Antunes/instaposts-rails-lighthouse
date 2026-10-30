# The #hashtags of posts, as Instagram's: written in a caption (or in a comment of the post's
# own author), kept lowercase and without the #. Post#sync_hashtags keeps post_hashtags.
class CreateHashtags < ActiveRecord::Migration[8.1]
  def change
    create_table :hashtags do |t|
      t.string :name, null: false
      t.timestamps
      t.index :name, unique: true
    end

    create_table :post_hashtags do |t|
      t.references :post, null: false, foreign_key: true, index: false
      t.references :hashtag, null: false, foreign_key: true
      t.timestamps
      t.index %i[post_id hashtag_id], unique: true
    end
  end
end
