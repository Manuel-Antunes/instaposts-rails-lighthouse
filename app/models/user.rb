class User < ApplicationRecord
  # The providers are the ones config/initializers/devise.rb turned on. Each identity a
  # user signs in with is an Account (provider + uid), so one user can have several.
  devise :database_authenticatable, :registerable, :recoverable, :rememberable, :trackable,
         :validatable, :confirmable, :omniauthable, omniauth_providers: Rails.configuration.x.omniauth_providers

  has_many :accounts, dependent: :destroy
  has_many :posts, foreign_key: :author_id, inverse_of: :author, dependent: :nullify
  has_many :likes, dependent: :destroy
  has_many :comments, foreign_key: :author_id, inverse_of: :author, dependent: :destroy
  # The picture the user chose; avatar_url (the column) is the one a provider gave.
  has_one_attached :avatar, service: :media

  # Found by @username first, then by name, as written (no stemming of names), from the GIN
  # index on search_vector: Query.people(term:) alone, and Query.search among posts and hashtags
  # (multisearch). A sign-in saves the user too: only these two update its document.
  include PgSearch::Model
  pg_search_scope :search, against: { username: "A", name: "B" }, ignoring: :accents,
                           using: { tsearch: { tsvector_column: "search_vector", dictionary: "simple", prefix: true } }
  multisearchable against: %i[username name], update_if: ->(user) { user.saved_change_to_username? || user.saved_change_to_name? }

  AVATAR_MAX_SIZE = 5.megabytes

  # Instagram's handles: 1 to 30 letters, numbers, underscores and periods, never two periods
  # in a row nor a period at the end or the start. Always lowercase.
  USERNAME_FORMAT = /\A(?!.*\.\.)(?!.*\.\z)[a-z0-9_][a-z0-9_.]{0,29}\z/

  enum :role, { reader: 0, author: 1, admin: 2 }, default: :reader

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :username, with: ->(username) { username.strip.downcase }

  before_validation :assign_username, on: :create

  validates :name, presence: true
  validates :username, presence: true, uniqueness: true,
                       format: { with: USERNAME_FORMAT, allow_blank: true,
                                 message: "can only have letters, numbers, underscores and periods, never two periods in a row or one at the end" },
                       length: { maximum: 30 }
  validate :avatar_is_a_small_image

  # A username nobody has, from what a person goes by: "Ana Souza" and "ana" make `ana_souza`
  # and `ana`; the next `ana` gets `ana1`.
  def self.available_username(seed)
    base = seed.to_s.downcase.gsub(/[^a-z0-9_.]/, "_").gsub(/\.{2,}/, ".").sub(/\A\.+/, "")
    base = base[0, 30].sub(/\.+\z/, "").presence || "user"

    candidate = base
    (1..).each do |n|
      return candidate unless exists?(username: candidate)

      candidate = "#{base[0, 30 - n.to_s.length].sub(/\.+\z/, '')}#{n}"
    end
  end

  # The chosen avatar, else the provider's picture, else nil (the frontend shows initials).
  def picture_url
    avatar.attached? ? avatar.url : self[:avatar_url]
  end

  # Raised when an OAuth2 sign-in matches a user who registered with a password and
  # never confirmed the email: linking would let whoever registered it first take
  # over the OAuth2 owner's account.
  class PasswordAccountExists < StandardError; end

  # Set while creating a user from a provider: they have no password.
  attr_accessor :from_provider

  # Finds or creates the user behind an OmniAuth auth hash. An account already
  # linked wins; otherwise the user is matched by email so signing in with a second
  # provider lands on the same account.
  def self.from_omniauth(auth)
    account = Account.find_or_initialize_by(provider: auth.provider, uid: auth.uid.to_s)
    return account.user if account.persisted?

    info = auth.info
    transaction do
      user = find_or_initialize_by(email: info.email.to_s.strip.downcase)
      raise PasswordAccountExists if user.encrypted_password.present? && !user.confirmed?

      user.name = info.name.presence || info.nickname.presence || user.email if user.new_record?
      user.username ||= available_username(info.nickname.presence || user.email.split("@").first)
      user.avatar_url ||= info.image
      user.from_provider = true
      # The provider vouches for the email: no confirmation email either.
      user.skip_confirmation! unless user.confirmed?
      user.save!
      account.user = user
      account.save!
      user
    end
  end

  def author_or_admin?
    author? || admin?
  end

  # Following a reset link proves the email is theirs: confirmed with the new password's save.
  def reset_password(new_password, new_password_confirmation)
    self.confirmed_at ||= Time.current if new_password.present?
    super
  end

  private

  def avatar_is_a_small_image
    return unless avatar.attached?

    errors.add(:avatar, "must be an image") unless avatar.content_type.to_s.start_with?("image/")
    errors.add(:avatar, "must be smaller than #{AVATAR_MAX_SIZE / 1.megabyte} MB") if avatar.byte_size > AVATAR_MAX_SIZE
  end

  protected

  # Whoever signs up without picking one gets a username from their email.
  def assign_username
    self.username = self.class.available_username(email.to_s.split("@").first) if username.blank?
  end

  # Users created from a provider have no password (Devise's validatable asks for one).
  def password_required? = !from_provider && super

  # Emails go out after the transaction, through Active Job, as everything else does.
  def send_devise_notification(notification, *args)
    devise_mailer.send(notification, self, *args).deliver_later
  end
end
