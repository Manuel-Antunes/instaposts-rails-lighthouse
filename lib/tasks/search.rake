namespace :search do
  desc "Tag every post with its #hashtags and rebuild the search box's documents (pg_search multisearch)"
  task rebuild: :environment do
    # The hashtags first: a hashtag's document is made as it is created.
    Post.find_each(&:sync_hashtags)
    [ User, Post, Hashtag ].each do |model|
      PgSearch::Multisearch.rebuild(model)
      puts "#{model.name}: #{PgSearch::Document.where(searchable_type: model.polymorphic_name).count} documents"
    end
  end
end
