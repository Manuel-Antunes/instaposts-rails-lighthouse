# Email and password sign-up (Devise). New users start as readers, signed in, with
# their email to confirm (Devise's confirmable sends the link).
class Users::RegistrationsController < Devise::RegistrationsController
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to new_user_registration_path, alert: "Too many attempts. Try again later." }

  before_action -> { devise_parameter_sanitizer.permit(:sign_up, keys: [ :name, :username ]) }, only: :create

  def new
    render inertia: "registrations/new"
  end

  # Errors go back to the form as Inertia's, not by rendering #new.
  def create
    super do |user|
      return redirect_to new_user_registration_path, inertia: { errors: user.errors } unless user.persisted?
    end
  end

  # Email and password, with the current password. A new email waits for its
  # confirmation (Devise's reconfirmable): the link goes to the new address.
  def update
    super do |user|
      return redirect_to profile_path, inertia: { errors: user.errors } if user.errors.any?
    end
  end

  protected

  def after_update_path_for(_resource) = profile_path

  # A user who only signs in with a provider has no current password to give: their
  # session is their proof. Everyone else confirms the change with it.
  def update_resource(user, params)
    return super if user.encrypted_password.present?

    user.update(params.except(:current_password))
  end
end
