# The signed-in user's profile: name and picture (ProfilePage, saved by updateProfile on
# /graphql), and email and password (Users::RegistrationsController#update).
class ProfilesController < InertiaController
  before_action :authenticate_user!

  def show
    render_preloaded props: { unconfirmed_email: current_user.unconfirmed_email, has_password: current_user.encrypted_password.present? }
  end
end
