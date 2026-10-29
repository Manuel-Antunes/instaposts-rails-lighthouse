class User < ApplicationRecord
  has_many :accounts, dependent: :destroy
  has_many :posts, foreign_key: :author_id, inverse_of: :author, dependent: :nullify
  has_many :likes, dependent: :destroy
  has_many :comments, foreign_key: :author_id, inverse_of: :author, dependent: :destroy

  # password_digest is null for users who only sign in through OAuth2, so the
  # built-in validations are off; signing up requires one (context: :signup).
  has_secure_password validations: false

  enum :role, { reader: 0, author: 1, admin: 2 }, default: :reader

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, presence: true, on: :signup
  validates :password, length: { minimum: 8, maximum: ActiveModel::SecurePassword::MAX_PASSWORD_LENGTH_ALLOWED },
                       confirmation: true, allow_nil: true

  # Raised when an OAuth2 sign-in matches a user who registered with a password.
  # The email on that account was never verified, so linking would let whoever
  # registered it first take over the OAuth2 owner's account.
  class PasswordAccountExists < StandardError; end

  # Finds or creates the user behind an OmniAuth auth hash. An account already
  # linked wins; otherwise the user is matched by email so signing in with a second
  # provider lands on the same account.
  def self.from_omniauth(auth)
    account = Account.find_or_initialize_by(provider: auth.provider, uid: auth.uid.to_s)
    return account.user if account.persisted?

    info = auth.info
    transaction do
      user = find_or_initialize_by(email: info.email.to_s.strip.downcase)
      raise PasswordAccountExists if user.password_digest?

      user.name = info.name.presence || info.nickname.presence || user.email if user.new_record?
      user.avatar_url ||= info.image
      user.save!
      account.user = user
      account.save!
      user
    end
  end

  def author_or_admin?
    author? || admin?
  end
end
