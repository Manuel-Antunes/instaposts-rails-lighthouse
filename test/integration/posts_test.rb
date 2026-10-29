require "test_helper"

class PostsTest < ActionDispatch::IntegrationTest
  test "guests can list and read posts" do
    inertia_visit :get, "/"
    assert_response :success
    assert_equal "posts/index", inertia_page["component"]
    assert_equal 3, inertia_page.dig("props", "posts").size
    assert_nil inertia_page.dig("props", "auth", "user")

    inertia_visit :get, "/posts/#{posts(:one).id}"
    assert_equal "posts/show", inertia_page["component"]
    assert_equal "First", inertia_page.dig("props", "post", "name")
  end

  test "posts are paginated" do
    12.times { |i| Post.create!(name: "P#{i}", content: "c", author: users(:author)) }

    inertia_visit :get, "/posts"
    assert_equal 10, inertia_page.dig("props", "posts").size
    assert inertia_page.dig("props", "has_next_page")

    inertia_visit :get, "/posts?page=2"
    assert_equal 5, inertia_page.dig("props", "posts").size
    assert_not inertia_page.dig("props", "has_next_page")
  end

  test "guests are sent to the login page when they try to write" do
    get "/posts/new"
    assert_redirected_to login_path

    assert_no_difference "Post.count" do
      post "/posts", params: { name: "x", content: "y" }
    end
    assert_redirected_to login_path
  end

  test "readers cannot write posts" do
    sign_in_as users(:reader)

    get "/posts/new"
    assert_redirected_to root_path
    assert_not inertia_page_can_create?

    assert_no_difference "Post.count" do
      post "/posts", params: { name: "x", content: "y" }
    end
  end

  test "authors can create posts and become their author" do
    sign_in_as users(:author)
    assert inertia_page_can_create?

    inertia_visit :get, "/posts/new"
    assert_equal "posts/new", inertia_page["component"]

    assert_difference "Post.count", 1 do
      post "/posts", params: { name: "Hello", content: "World" }
    end
    created = Post.order(:id).last
    assert_equal users(:author), created.author
    assert_redirected_to post_path(created)
  end

  test "admins can create posts" do
    sign_in_as users(:admin)

    assert_difference "Post.count", 1 do
      post "/posts", params: { name: "Hello", content: "World" }
    end
  end

  test "invalid posts go back to the form with errors" do
    sign_in_as users(:author)

    assert_no_difference "Post.count" do
      post "/posts", params: { name: "", content: "" }, headers: { "X-Inertia" => "true" }
    end
    assert_redirected_to new_post_path

    inertia_visit :get, "/posts/new"
    assert_includes inertia_page["props"]["errors"].keys, "name"
  end

  test "the login page lists the configured providers" do
    inertia_visit :get, "/login"
    assert_equal "sessions/new", inertia_page["component"]
    assert_kind_of Array, inertia_page.dig("props", "providers")
  end

  private

  def inertia_page_can_create?
    inertia_visit :get, "/"
    inertia_page.dig("props", "auth", "user", "can_create_post")
  end
end
