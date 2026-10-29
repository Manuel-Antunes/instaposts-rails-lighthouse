# Email and password sign-up. New users start as readers.
class RegistrationsController < InertiaController
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to signup_path, alert: "Too many attempts. Try again later." }

  def new
    return redirect_to root_path if current_user

    render inertia: {}
  end

  def create
    user = User.new(params.permit(:name, :email, :password, :password_confirmation))

    if user.save(context: :signup)
      sign_in(user)
      redirect_to root_path, notice: "Welcome, #{user.name}."
    else
      redirect_to signup_path, inertia: { errors: user.errors }
    end
  end
end
