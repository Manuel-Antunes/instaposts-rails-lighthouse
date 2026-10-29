class CreatePosts < ActiveRecord::Migration[8.1]
  def change
    create_table :posts do |t|
      t.string :name
      t.text :content
      t.boolean :active

      t.timestamps
    end
  end
end
