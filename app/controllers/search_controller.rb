# The search page, /explore/search?q=: the people, hashtags and posts that match (SearchPage,
# each field a Lighthouse @search). The first page of the posts is preloaded; the next ones
# are fetchMore on /graphql. The search box in the header asks Query.search as you type.
class SearchController < InertiaController
  def index
    term = params[:q].to_s.strip

    # "#rails", a hashtag that exists, is its page, as Instagram goes to the tag.
    hashtag = term.start_with?("#") && Hashtag.find_by(name: Hashtag.normalize_value_for(:name, term))
    return redirect_to hashtag_path(hashtag.name) if hashtag

    render_preloaded variables: { term: term }
  end
end
