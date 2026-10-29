class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "Blog Rails <no-reply@blog-rails.test>")
  layout "mailer"
end
