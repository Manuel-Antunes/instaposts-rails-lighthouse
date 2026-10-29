# Signs and verifies the JWTs handed out after an OAuth2 sign-in.
module AuthToken
  ALGORITHM = "HS256".freeze
  EXPIRES_IN = 24.hours

  class << self
    def encode(user, expires_in: EXPIRES_IN)
      now = Time.current.to_i
      JWT.encode({ sub: user.id.to_s, iat: now, exp: now + expires_in.to_i }, secret, ALGORITHM)
    end

    # The user the token was issued to, or nil when it is invalid, expired or the user is gone.
    def user_for(token)
      payload, = JWT.decode(token, secret, true, algorithm: ALGORITHM, verify_expiration: true)
      User.find_by(id: payload["sub"])
    rescue JWT::DecodeError
      nil
    end

    private

    def secret = Rails.application.secret_key_base
  end
end
