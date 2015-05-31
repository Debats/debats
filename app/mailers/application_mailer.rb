class ApplicationMailer < ActionMailer::Base
  default from: MAIL_FROM_NO_REPLY_WITH_NAME
  layout 'mailer'
end
