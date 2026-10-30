# A hashtag's page at /explore/tags/:name, as Instagram's: the live posts it tags, newest
# first (HashtagShowPage). The first page of the grid is preloaded; the next ones are
# fetchMore on /graphql.
class HashtagsController < InertiaController
  def show
    hashtag = Hashtag.find_by!(name: Hashtag.normalize_value_for(:name, params[:name]))

    # /explore/tags/Rails is /explore/tags/rails: one address for each tag.
    return redirect_to hashtag_path(hashtag.name), status: :moved_permanently if params[:name] != hashtag.name

    render_preloaded variables: { name: hashtag.name }
  end
end
