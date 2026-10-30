# A user's public page at /@username (UserShowPage): picture, name and a grid of their posts.
# The first page of the grid is preloaded; the next ones are fetchMore on /graphql.
class UsersController < InertiaController
  def show
    user = User.find_by!(username: params[:username])
    authorize user

    # /@Ana is /@ana: one address for each person.
    return redirect_to user_path(username: user.username), status: :moved_permanently if params[:username] != user.username

    render_preloaded variables: { username: user.username }
  end
end
