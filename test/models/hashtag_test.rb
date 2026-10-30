require "test_helper"

# A post's #hashtags: those of its caption and of its author's own comments, as Instagram's.
class HashtagTest < ActiveSupport::TestCase
  def tags(post) = post.reload.hashtags.order(:name).pluck(:name)

  test "a hashtag is a # then letters, digits and underscores, with a letter, stored lowercase" do
    assert_equal %w[travel café rails8 são_paulo], Hashtag.names_in("#Travel #café #Rails8 #São_Paulo")
    assert_equal %w[rails ruby graphql], Hashtag.names_in("(#rails), #ruby. #graphql!")
  end

  test "a # inside a word or a URL, or followed by digits only, is not a hashtag" do
    assert_empty Hashtag.names_in("#2026 C# html&#39; example.com/#anchor a#b ##double")
  end

  test "each tag once, in the order written, at most as long as a tag may be" do
    assert_equal %w[rails ruby], Hashtag.names_in("#rails #Ruby #RAILS ##{'x' * (Hashtag::MAX_LENGTH + 1)}")
  end

  test "the same tag, typed in a decomposed form, is the same tag" do
    assert_equal [ "café" ], Hashtag.names_in("#café")
    assert_equal "café", Hashtag.create!(name: "#Café").name
  end

  test "a post is tagged with its caption's hashtags, which are created once" do
    first = Post.create!(name: "Trip", content: "Lisbon #Travel #portugal", author: users(:author))
    second = Post.create!(name: "Again", content: "#travel again", author: users(:author))

    assert_equal %w[portugal travel], tags(first)
    assert_equal %w[travel], tags(second)
    assert_equal 1, Hashtag.where(name: "travel").count
  end

  test "editing the caption tags it anew" do
    post = Post.create!(name: "Trip", content: "#travel #lisbon", author: users(:author))
    post.update!(content: "#travel #porto")

    assert_equal %w[porto travel], tags(post)
    assert Hashtag.exists?(name: "lisbon"), "the tag stays, for the other posts that have it"
  end

  test "the author's own comments tag the post, others' do not" do
    post = Post.create!(name: "Trip", content: "#travel", author: users(:author))
    post.comments.create!(author: users(:reader), body: "Lovely #spam")
    comment = post.comments.create!(author: users(:author), body: "More soon #sneakpeek")
    assert_equal %w[sneakpeek travel], tags(post)

    comment.update!(body: "More soon #teaser")
    assert_equal %w[teaser travel], tags(post)

    comment.destroy!
    assert_equal %w[travel], tags(post)
  end

  test "a caption has at most 30 hashtags, as Instagram's" do
    post = Post.new(name: "Tags", content: (1..31).map { "#tag#{_1}x" }.join(" "), author: users(:author))
    assert_not post.valid?
    assert_includes post.errors[:content], "can have at most 30 hashtags"

    post.content = (1..30).map { "#tag#{_1}x" }.join(" ")
    assert post.valid?
  end

  test "a hashtag's posts are its live ones, and a search finds it only while it has one" do
    post = Post.create!(name: "Trip", content: "#travel", author: users(:author))
    hashtag = Hashtag.find_by!(name: "travel")
    assert_equal [ post ], hashtag.posts.to_a
    assert_equal [ hashtag ], Hashtag.search_results.to_a

    post.discard!
    assert_empty hashtag.posts.reload
    assert_empty Hashtag.search_results
  end
end
