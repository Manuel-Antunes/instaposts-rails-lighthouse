require "test_helper"

# Lighthouse's Upload scalar and @upload, on the public "media" service (a public
# directory in tests, MinIO in development): posts' images and videos, users' avatars.
class UploadsTest < ActionDispatch::IntegrationTest
  CREATE = <<~GQL.freeze
    mutation($files: [Upload!]) {
      createPost(input: { name: "Trip", content: "Pictures", files: $files }) {
        name author { name } assets { kind url contentType }
      }
    }
  GQL
  PROFILE = <<~GQL.freeze
    mutation($name: String, $avatar: Upload) {
      updateProfile(input: { name: $name, avatar: $avatar }) { name avatarUrl }
    }
  GQL

  test "an author publishes a post with images and videos, in order" do
    result = assert_difference [ "Post.count" ], 1 do
      assert_difference "PostAsset.count", 2 do
        gql_upload(CREATE, as: users(:author), variables: { files: [ nil, nil ] }, files: { "files.0" => "clip.mp4", "files.1" => "photo.png" })
      end
    end

    post = result.dig("data", "createPost")
    assert_equal "Alice Author", post.dig("author", "name")
    assert_equal [ [ "VIDEO", "video/mp4" ], [ "IMAGE", "image/png" ] ], post["assets"].map { _1.values_at("kind", "contentType") }
    assert(post["assets"].all? { _1["url"].start_with?("http://www.example.com/rails/active_storage/disk/") })
    assert_equal [ "media" ], PostAsset.last.file.blob.then { [ _1.service_name ] }
    assert PostAsset.last.file.blob.key.start_with?("posts/")
  end

  test "a post without files is text only" do
    result = gql(CREATE, as: users(:author))
    assert_equal [], result.dig("data", "createPost", "assets")
  end

  test "only images and videos, and a refused post leaves no file behind" do
    result = assert_no_difference [ "Post.count", "PostAsset.count", "ActiveStorage::Blob.count" ] do
      gql_upload(CREATE, as: users(:author), variables: { files: [ nil, nil ] }, files: { "files.0" => "photo.png", "files.1" => "notes.txt" })
    end
    assert_equal [ "Assets[1] file must be an image or a video" ], result.dig("errors", 0, "extensions", "validation", "assets[1].file")
  end

  test "at most 10 files" do
    files = 11.times.to_h { [ "files.#{_1}", "photo.png" ] }
    result = gql_upload(CREATE, as: users(:author), variables: { files: Array.new(11) }, files: files)
    assert_equal [ "Assets can be at most 10" ], result.dig("errors", 0, "extensions", "validation", "assets")
  end

  test "a refused upload stores nothing: readers cannot post" do
    assert_no_difference "ActiveStorage::Blob.count" do
      result = gql_upload(CREATE, as: users(:reader), variables: { files: [ nil ] }, files: { "files.0" => "photo.png" })
      assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
    end
  end

  test "the feed and a post's page carry the assets" do
    gql_upload(CREATE, as: users(:author), variables: { files: [ nil ] }, files: { "files.0" => "photo.png" })

    inertia_visit :get, "/"
    newest = inertia_page.dig("props", "page_query", "data", "posts", "edges", 0, "node")
    assert_equal "Trip", newest["name"]
    assert_equal [ "IMAGE" ], newest["assets"].map { _1["kind"] }
  end

  test "deleting a post for good purges its files" do
    gql_upload(CREATE, as: users(:author), variables: { files: [ nil ] }, files: { "files.0" => "photo.png" })
    post = Post.order(:id).last
    post.discard!

    blob = post.assets.first.file.blob
    perform_enqueued_jobs do
      gql("mutation($id: ID!) { forceDeletePost(id: $id) { id } }", as: users(:admin), variables: { id: post.to_gid_param })
    end
    assert_not PostAsset.exists?(post_id: post.id)
    assert_not ActiveStorage::Blob.exists?(blob.id)
  end

  test "a user changes their name and picture, and goes back to the provider's" do
    users(:author).update!(avatar_url: "https://avatars.example.com/alice.png")

    result = gql_upload(PROFILE, as: users(:author), variables: { name: " Alice A. ", avatar: nil }, files: { "avatar" => "photo.png" })
    profile = result.dig("data", "updateProfile")
    assert_equal "Alice A.", profile["name"]
    assert_match %r{/rails/active_storage/disk/}, profile["avatarUrl"]
    assert users(:author).reload.avatar.blob.key.start_with?("avatars/")

    result = perform_enqueued_jobs { gql("mutation { removeAvatar { avatarUrl } }", as: users(:author)) }
    assert_equal "https://avatars.example.com/alice.png", result.dig("data", "removeAvatar", "avatarUrl")
    assert_not users(:author).reload.avatar.attached?
  end

  test "an avatar must be an image" do
    result = gql_upload(PROFILE, as: users(:author), variables: { avatar: nil }, files: { "avatar" => "notes.txt" })
    assert_equal [ "Avatar must be an image" ], result.dig("errors", 0, "extensions", "validation", "input.avatar")
  end

  test "guests have no profile to update, nor a picture to remove" do
    assert_equal "Unauthenticated.", gql(PROFILE, variables: { name: "x" }).dig("errors", 0, "message")
    assert_equal "Unauthenticated.", gql("mutation { removeAvatar { id } }").dig("errors", 0, "message")
  end
end
