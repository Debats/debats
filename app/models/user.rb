class User < ActiveRecord::Base
  attr_accessor :remember_token

  ## PASSWORD MANAGEMENT
  has_secure_password

  ## EMAIL ALWAYS IN DOWNCASE
  before_save { self.email.downcase! }

  ## NAME VALIDATION
  validates :name,
      presence: true,
      length: {maximum: 50}

  ## EMAIL VALIDATION
  VALID_EMAIL_REGEX =/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i
  validates :email,
      presence: true,
      length: {maximum: 255},
      format: {with:VALID_EMAIL_REGEX},
      uniqueness: {case_sensitive: false}

  ## PASSWORD VALIDATION
  validates :password, length: {minimum: 8}, allow_blank: true

  def remember
    self.remember_token = User.new_token
    update_attribute(:remember_digest, User.digest(remember_token))
  end

  # token matches the digest ?
  def authenticated?(remember_token)
    return false if remember_digest.nil?
    BCrypt::Password.new(remember_digest).is_password?(remember_token)
  end

  # forget remembered session
  def forget
    update_attribute(:remember_digest, nil)
  end

  class << self

    # Returns a digest
    def digest(string)
      cost = ActiveModel::SecurePassword.min_cost ? BCrypt::Engine::MIN_COST :
                                                    BCrypt::Engine.cost
      BCrypt::Password.create(string, cost: cost)
    end

    # Returns a random token.
    def new_token
      SecureRandom.urlsafe_base64
    end

  end

end
