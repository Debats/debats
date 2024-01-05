class User < ActiveRecord::Base
  attr_accessor :remember_token, :activation_token, :reset_token

  ## DEFAULT VALUES
  after_initialize :default_values

  ## NAME VALIDATION
  validates :name,
      presence: true,
      length: {maximum: 50}

  validates :reputation,
      presence: true

  ## EMAIL VALIDATION
  VALID_EMAIL_REGEX =/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i
  validates :email,
      presence: true,
      length: {maximum: 255},
      format: {with:VALID_EMAIL_REGEX},
      uniqueness: {case_sensitive: false}

  ## PASSWORD MANAGEMENT
  has_secure_password
  ## PASSWORD VALIDATION
  validates :password, length: {minimum: 8}, allow_blank: true

  ## EMAIL ALWAYS IN DOWNCASE
  before_save { self.email.downcase! }

  ## ACTIVATION DIGEST CREATION
  before_create :create_activation_digest


  def remember
    self.remember_token = User.new_token
    update_attribute(:remember_digest, User.digest(remember_token))
  end

  # token matches the digest ?
  def authenticated?(attribute, token)
    digest = send("#{attribute}_digest")
    return false if digest.nil?
    BCrypt::Password.new(digest).is_password?(token)
  end

  # forget remembered session
  def forget
    update_attribute(:remember_digest, nil)
  end

  def send_activation_email
    UserMailer.account_activation(self).deliver_now
  end

  def activate
    update_columns(activated: true, activated_at: Time.zone.now)
  end

  def create_reset_digest
    self.reset_token = User.new_token
    update_columns(reset_digest: User.digest(reset_token), reset_sent_at: Time.zone.now)
  end

  def send_password_reset_email
    UserMailer.password_reset(self).deliver_now
  end

  def password_reset_expired?
    reset_sent_at < 2.hours.ago
  end

  private
    def create_activation_digest
      self.activation_token = User.new_token
      self.activation_digest = User.digest(activation_token)
    end

    def default_values
      self.reputation ||= 0
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
