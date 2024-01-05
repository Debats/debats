require 'test_helper'

class UserMailerTest < ActionMailer::TestCase
  test "account_activation" do
    user = users(:Jalil)
    user.activation_token = User.new_token
    mail = UserMailer.account_activation(user)
    assert_equal "Activation de votre compte #{APP_NAME}", mail.subject
    assert_equal [user.email], mail.to
    assert_equal [MAIL_FROM_NO_REPLY],      mail.from
    assert_match user.name,               mail.body.encoded
    assert_match user.activation_token,   mail.body.encoded
    assert_match CGI::escape(user.email), mail.body.encoded
  end

  test "password_reset" do
    user = users(:Jalil)
    user.reset_token = User.new_token
    mail = UserMailer.password_reset(user)
    assert_match "nouveau mot de passe ", mail.subject
    assert_equal [user.email],          mail.to
    assert_equal [MAIL_FROM_NO_REPLY],    mail.from
    assert_match user.name,             mail.body.encoded
    assert_match user.reset_token,      mail.body.encoded
    assert_match CGI::escape(user.email),mail.body.encoded
  end

end
