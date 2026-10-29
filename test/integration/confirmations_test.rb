require "test_helper"

class ConfirmationsTest < ActionDispatch::IntegrationTest
  SIGNUP = { name: "Jane Doe", email: "jane@example.com", password: "s3cret-pass", password_confirmation: "s3cret-pass" }.freeze

  def jane = User.find_by!(email: "jane@example.com")

  test "signing up emails a confirmation link, and the account waits for it" do
    perform_enqueued_jobs { post "/signup", params: SIGNUP }

    assert_not jane.confirmed?
    assert_equal [ "jane@example.com" ], ActionMailer::Base.deliveries.last.to
    inertia_visit :get, "/"
    assert_equal false, inertia_page.dig("props", "auth", "user", "confirmed")
  end

  test "an unconfirmed user cannot like or comment" do
    post "/signup", params: SIGNUP
    id = posts(:one).to_gid_param

    assert_equal "This action is unauthorized.", gql("mutation($id: ID!) { likePost(id: $id) { id } }", as: jane, variables: { id: id }).dig("errors", 0, "message")
    result = gql("mutation($id: ID!) { createComment(input: { postId: $id, body: \"hi\" }) { id } }", as: jane, variables: { id: id })
    assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
  end

  test "the emailed link confirms the email, once" do
    perform_enqueued_jobs { post "/signup", params: SIGNUP }
    link = link_in_last_email
    delete "/logout"

    get link
    assert_redirected_to root_path
    assert_equal "Your email is confirmed.", flash[:notice]
    assert jane.confirmed?

    get link
    assert_equal "That confirmation link is invalid or has expired.", flash[:alert]
  end

  test "a link stops working when it expires or the email changes" do
    perform_enqueued_jobs { post "/signup", params: SIGNUP }
    link = link_in_last_email

    travel 4.days do
      get link
      assert_not jane.confirmed?
    end

    user = jane
    user.update!(email: "jane@elsewhere.com")
    get link
    assert_not user.reload.confirmed?

    get "/confirmations/garbage"
    assert_equal "That confirmation link is invalid or has expired.", flash[:alert]
  end

  test "a signed-in, unconfirmed user asks for the link again" do
    post "/signup", params: SIGNUP

    assert_emails(1) { perform_enqueued_jobs { post "/confirmation" } }
    get link_in_last_email
    assert jane.confirmed?

    assert_no_emails { perform_enqueued_jobs { post "/confirmation" } }
    assert_equal "Your email is already confirmed.", flash[:notice]
  end

  test "guests are asked to sign in first" do
    post "/confirmation"
    assert_redirected_to login_path
  end

  test "an OAuth2 sign-in links to an account whose email is confirmed" do
    perform_enqueued_jobs { post "/signup", params: SIGNUP }
    get link_in_last_email
    delete "/logout"

    OmniAuth.config.test_mode = true
    Rails.application.env_config["omniauth.auth"] = OmniAuth::AuthHash.new(
      provider: "github", uid: "jane-gh", info: { email: "jane@example.com", name: "Jane" }
    )
    assert_difference "Account.count", 1 do
      get "/auth/github/callback"
    end
    assert_redirected_to root_path
    assert_equal [ "github" ], jane.accounts.pluck(:provider)
  ensure
    OmniAuth.config.test_mode = false
    Rails.application.env_config.delete("omniauth.auth")
  end

  test "users who sign up with a provider are confirmed" do
    sign_in_as users(:reader)
    user = User.from_omniauth(OmniAuth::AuthHash.new(provider: "github", uid: "new", info: { email: "new@example.com", name: "New" }))
    assert user.confirmed?
  end
end
