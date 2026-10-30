# The images and videos of a post, in order. The file itself is an Active Storage
# attachment (PostAsset#file) on the public "media" service.
class CreatePostAssets < ActiveRecord::Migration[8.1]
  def change
    create_table :post_assets do |t|
      t.references :post, null: false, foreign_key: true
      t.integer :kind, null: false
      t.integer :position, null: false, default: 0

      t.timestamps
    end
    add_index :post_assets, %i[post_id position]
  end
end
