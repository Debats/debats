User.create!(name:  "Jalil Arfaoui",
             email: "jalil@arfaoui.net",
             password:              "usbeck78",
             password_confirmation: "usbeck78",
             reputation: 1000,
             activated: true,
             activated_at: Time.zone.now)

99.times do |n|
  name  = Faker::Name.name
  email = "example-#{n+1}@railstutorial.org"
  password = "password"
  User.create!(name:  name,
               email: email,
               password:              password,
               password_confirmation: password,
               activated: true,
               activated_at: Time.zone.now)
end

100.times do |n|
  subject = Faker::Lorem.sentence(3, true, 5)
  presentation = Faker::Lorem.sentences(5, true)
  Subject.create!(title: subject, presentation: presentation)
end