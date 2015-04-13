class ApplicationMailer < ActionMailer::Base
  default from: MAIL_FROM_NO_REPLY
  layout 'mailer'
end
