require "test_helper"

# Devise's confirmable: unconfirmed users sign in, but write nothing until they
# follow the emailed link.
class ConfirmationsTest < ActionDispatch::IntegrationTest
  SIGNUP = { name: "Jane Doe", email: "jane@example.com", password: "s3cret-pass", password_confirmation: "s3cret-pass" }.freeze

  def jane = User.find_by!(email: "jane@example.com")
  def sign_up = perform_enqueued_jobs { post "/signup", params: { user: SIGNUP } }

  test "signing up emails a confirmation link, and the account waits for it" do
    sign_up

    assert_not jane.confirmed?
    assert_equal [ "jane@example.com" ], ActionMailer::Base.deliveries.last.to
    assert_equal "Welcome! Check your email to confirm it.", flash[:notice]
    inertia_visit :get, "/"
    assert_equal false, inertia_page.dig("props", "auth", "user", "confirmed")
  end

  test "an unconfirmed user cannot like or comment" do
    sign_up
    id = posts(:one).to_gid_param

    assert_equal "This action is unauthorized.", gql("mutation($id: ID!) { likePost(id: $id) { id } }", as: jane, variables: { id: id }).dig("errors", 0, "message")
    result = gql("mutation($id: ID!) { createComment(input: { postId: $id, body: \"hi\" }) { id } }", as: jane, variables: { id: id })
    assert_equal "This action is unauthorized.", result.dig("errors", 0, "message")
  end

  test "the emailed link confirms the email, once" do
    sign_up
    link = link_in_last_email
    delete "/logout"

    get link
    assert_redirected_to new_user_session_path
    assert_equal "Your email address has been successfully confirmed.", flash[:notice]
    assert jane.confirmed?

    get link
    assert_equal "That confirmation link is invalid or has expired.", flash[:alert]
  end

  test "a link stops working when it expires, and a made-up one never works" do
    sign_up
    link = link_in_last_email

    travel 4.days do
      get link
      assert_not jane.confirmed?
    end

    get "/confirmation?confirmation_token=garbage"
    assert_equal "That confirmation link is invalid or has expired.", flash[:alert]
  end

  test "a signed-in, unconfirmed user asks for the link again" do
    sign_up

    assert_emails(1) { perform_enqueued_jobs { post "/confirmation", params: { user: { email: "jane@example.com" } } } }
    assert_redirected_to root_path
    get link_in_last_email
    assert jane.confirmed?

    assert_no_emails { perform_enqueued_jobs { post "/confirmation", params: { user: { email: "jane@example.com" } } } }
  end

  test "an OAuth2 sign-in links to an account whose email is confirmed" do
    sign_up
    get link_in_last_email
    delete "/logout"

    mock_oauth(uid: "jane-gh", email: "jane@example.com", name: "Jane")
    assert_difference "Account.count", 1 do
      get "/auth/github/callback"
    end
    assert_redirected_to root_path
    assert_equal [ "github" ], jane.accounts.pluck(:provider)
  end

  test "users who sign up with a provider are confirmed, and get no email" do
    assert_no_emails do
      user = perform_enqueued_jobs { User.from_omniauth(OmniAuth::AuthHash.new(provider: "github", uid: "new", info: { email: "new@example.com", name: "New" })) }
      assert user.confirmed?
      assert_equal "", user.encrypted_password
    end
  end
end
