require "test_helper"

# Search, through Lighthouse's @search on pg_search: the search box (Query.search, people,
# posts and hashtags in one ranked list), each kind alone, and the pages they lead to.
class SearchTest < ActionDispatch::IntegrationTest
  SEARCH_BOX = <<~GQL.freeze
    query($term: String!, $first: Int, $page: Int) {
      search(term: $term, first: $first, page: $page) {
        data { __typename ... on User { username } ... on Post { name } ... on Hashtag { name postsCount } }
        paginatorInfo { total hasMorePages }
      }
    }
  GQL

  setup do
    # Fixtures skip callbacks: their users get their documents here, as `search:rebuild` gives them.
    PgSearch::Multisearch.rebuild(User)
    @lisbon = Post.create!(name: "Weekend in Lisbon", content: "Pastéis and trams #travel #lisboa", author: users(:author))
    @porto = Post.create!(name: "Porto by the river", content: "Wine and bridges #travel", author: users(:admin))
    @joao = User.create!(name: "João Gonçalves", username: "joao", email: "joao@example.com", password: "Secret123!", confirmed_at: Time.current)
  end

  def search_box(term, **variables) = gql(SEARCH_BOX, variables: { term: term, **variables }).dig("data", "search")
  def found(result) = result["data"].map { [ _1["__typename"], _1["username"] || _1["name"] ] }
  def page_query = inertia_page.dig("props", "page_query")

  test "the search box finds people, hashtags and posts in one list, short matches first" do
    result = search_box("travel")
    assert_equal [ "Hashtag", "travel" ], found(result).first, "a #hashtag outranks a caption that has it"
    assert_equal [ [ "Post", "Porto by the river" ], [ "Post", "Weekend in Lisbon" ] ], found(result).drop(1).sort
    assert_equal 2, result.dig("data", 0, "postsCount")
    assert_equal 3, result.dig("paginatorInfo", "total")
  end

  test "a word being typed matches, and accents are ignored" do
    assert_equal [ [ "User", "joao" ] ], found(search_box("joa"))
    assert_equal [ [ "User", "joao" ] ], found(search_box("Goncalves"))
    assert_includes found(search_box("pasteis")), [ "Post", "Weekend in Lisbon" ]
  end

  test "pages of the search box come with an exact total" do
    first = search_box("travel", first: 2)
    assert_equal 2, first["data"].size
    assert first.dig("paginatorInfo", "hasMorePages")

    second = search_box("travel", first: 2, page: 2)
    assert_equal 1, second["data"].size
    assert_equal 3, second.dig("paginatorInfo", "total")
    assert_empty found(first) & found(second)
  end

  test "a trashed post is not found, nor a hashtag only it had" do
    @lisbon.discard!

    assert_equal [ [ "Hashtag", "travel" ], [ "Post", "Porto by the river" ] ], found(search_box("travel"))
    assert_empty found(search_box("lisboa"))
  end

  test "a post restored from the trash is found again" do
    @lisbon.discard!
    gql("mutation($id: ID!) { restorePost(id: $id) { id } }", as: users(:admin), variables: { id: @lisbon.to_gid_param })

    assert_includes found(search_box("lisbon")), [ "Post", "Weekend in Lisbon" ]
  end

  test "a renamed user is found by the new name only" do
    @joao.update!(name: "Joana Silva")

    assert_equal [ [ "User", "joao" ] ], found(search_box("joana"))
    assert_empty found(search_box("goncalves"))
  end

  test "people, hashtags and posts are each searched alone too" do
    data = gql(<<~GQL).fetch("data")
      {
        people(term: "ali", first: 5) { edges { node { username email } } }
        hashtags(term: "l", first: 5) { edges { node { name postsCount } } }
        posts(search: "river", first: 5) { edges { node { name } } pageInfo { total } }
      }
    GQL

    assert_equal [ { "username" => "alice", "email" => nil } ], data.dig("people", "edges").map { _1["node"] }, "no email for strangers"
    assert_equal [ [ "lisboa", 1 ] ], data.dig("hashtags", "edges").map { _1["node"].values_at("name", "postsCount") }
    assert_equal [ "Porto by the river" ], data.dig("posts", "edges").map { _1.dig("node", "name") }
    assert_equal 1, data.dig("posts", "pageInfo", "total")
  end

  test "hashtags that rank alike come most used first" do
    Post.create!(name: "Rails", content: "#railway", author: users(:author))
    2.times { |n| Post.create!(name: "Rails #{n}", content: "#rails", author: users(:author)) }

    names = gql(%({ hashtags(term: "rail", first: 5) { edges { node { name } } } })).dig("data", "hashtags", "edges").map { _1.dig("node", "name") }
    assert_equal %w[rails railway], names
  end

  test "posts: the best match first, then the client's order among equals" do
    Post.create!(name: "Lisbon again", content: "More of Lisbon, Lisbon and Lisbon", author: users(:author))
    names = ->(order) { gql(%({ posts(search: "lisbon", first: 5, orderBy: [{ column: CREATED_AT, order: #{order} }]) { edges { node { name } } } })).dig("data", "posts", "edges").map { _1.dig("node", "name") } }

    assert_equal "Lisbon again", names.call("ASC").first, "the most matches rank first, whatever the order"
    assert_equal names.call("ASC").first, names.call("DESC").first
  end

  test "posts without a search are the feed, as before" do
    names = gql("{ posts(first: 2, orderBy: [{ column: CREATED_AT, order: DESC }]) { edges { node { name } } } }").dig("data", "posts", "edges").map { _1.dig("node", "name") }
    assert_equal [ "Porto by the river", "Weekend in Lisbon" ], names
  end

  test "the search box needs a term" do
    errors = gql("{ search(first: 5) { data { __typename } } }")["errors"]
    assert_match(/term/, errors.first["message"])
  end

  test "a hashtag, with its live posts, newest first" do
    hashtag = gql(%({ hashtag(name: "travel") { name postsCount posts(first: 5, orderBy: [{ column: CREATED_AT, order: DESC }]) { edges { node { name } } } } })).dig("data", "hashtag")

    assert_equal [ "travel", 2 ], hashtag.values_at("name", "postsCount")
    assert_equal [ "Porto by the river", "Weekend in Lisbon" ], hashtag.dig("posts", "edges").map { _1.dig("node", "name") }
  end

  test "the search page preloads the people, hashtags and posts that match" do
    inertia_visit :get, "/explore/search", params: { q: " lisb " }

    assert_response :success
    assert_equal [ "search/index", "SearchPage" ], [ inertia_page["component"], page_query["operation"] ]
    assert_equal({ "term" => "lisb" }, page_query["variables"])
    data = page_query["data"]
    assert_equal [ "lisboa" ], data.dig("hashtags", "edges").map { _1.dig("node", "name") }
    assert_equal [ "Weekend in Lisbon" ], data.dig("posts", "edges").map { _1.dig("node", "name") }
    assert_empty data.dig("people", "edges")
  end

  test "the search page with nothing searched finds nothing" do
    inertia_visit :get, "/explore/search"

    assert_response :success
    assert_equal({ "term" => "" }, page_query["variables"])
    assert_nil page_query["errors"]
    assert_empty page_query.dig("data", "posts", "edges")
  end

  test "searching a hashtag that exists goes to its page" do
    get "/explore/search", params: { q: "#Travel" }
    assert_redirected_to "/explore/tags/travel"

    inertia_visit :get, "/explore/search", params: { q: "#nothing" }
    assert_equal "search/index", inertia_page["component"]
  end

  test "a hashtag's page preloads its posts" do
    Post.create!(name: "Coffee", content: "Morning #café", author: users(:author))

    inertia_visit :get, "/explore/tags/caf%C3%A9"
    assert_response :success
    assert_equal [ "hashtags/show", "HashtagShowPage" ], [ inertia_page["component"], page_query["operation"] ]
    assert_equal({ "name" => "café" }, page_query["variables"])
    assert_equal [ "Coffee" ], page_query.dig("data", "hashtag", "posts", "edges").map { _1.dig("node", "name") }
  end

  test "a hashtag's address is one: /explore/tags/Travel goes to /explore/tags/travel" do
    get "/explore/tags/Travel"
    assert_redirected_to "/explore/tags/travel"
    assert_response :moved_permanently
  end

  test "a hashtag nobody used is a 404" do
    get "/explore/tags/nothing"
    assert_response :not_found
  end
end
