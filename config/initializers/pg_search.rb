# How Query.search (people, posts and hashtags together: Lighthouse's @search on a union)
# ranks the multisearch documents: a word being typed matches its start ("ra" finds #rails),
# "sao" finds "São", and words count as written (the "simple" dictionary: no English
# stemming of names and handles). The rank is divided by the document's length
# (normalization: 2), so a short match, a @username or a #hashtag, comes before a long
# caption that repeats the word, as in Instagram's search box.
PgSearch.multisearch_options = {
  using: { tsearch: { prefix: true, dictionary: "simple", normalization: 2 } },
  ignoring: :accents
}
