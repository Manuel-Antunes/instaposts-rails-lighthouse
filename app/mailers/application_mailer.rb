class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "InstaPosts <no-reply@instaposts.test>")
  layout "mailer"
end
