class CreateComments < ActiveRecord::Migration[8.1]
  def change
    create_table :comments do |t|
      t.references :post, null: false, foreign_key: true
      t.references :author, null: false, foreign_key: { to_table: :users }
      t.text :body, null: false

      t.timestamps
    end
    add_index :comments, %i[post_id created_at]

    add_column :posts, :comments_count, :integer, null: false, default: 0
  end
end
