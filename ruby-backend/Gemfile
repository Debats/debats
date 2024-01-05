source 'https://rubygems.org'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '4.2.3'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'
# Use CoffeeScript for .coffee assets and views
gem 'coffee-rails', '~> 4.1.0'
gem 'coffee-script-source', '1.8.0' # Problem with Coffee-script-source 1.9.0 on Windows
# See https://github.com/sstephenson/execjs#readme for more supported runtimes
# gem 'therubyracer', platforms: :ruby

# Use jquery as the JavaScript library
gem 'jquery-rails'
# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
gem 'turbolinks'
gem 'jquery-turbolinks'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.0'
# bundle exec rake doc:rails generates the API under doc/api.
gem 'sdoc', '~> 0.4.0', group: :doc

# Custom responders (https://github.com/plataformatec/responders)
gem "responders"

# Paginate
gem "will_paginate"
gem "bootstrap-will_paginate"

# uploads and images
gem 'carrierwave',             '0.10.0'
gem 'mini_magick',             '3.8.0'
gem 'fog',                     '1.23.0'

# Use ActiveModel has_secure_password
gem 'bcrypt', '~> 3.1.7'

# friendly ids (slugs)
gem 'friendly_id'

# SSL
gem 'net-ssh'

######## UI #######
gem 'jquery-ui-rails'             # JQuery UI
gem 'rails-jquery-autocomplete'   # Rails JQuery Autocomplete
gem 'sass-rails', '~> 5.0'        # Use SCSS for stylesheets
gem 'bootstrap-sass'              # Boostrap with SASS
gem 'bootstrap-datepicker-rails'  # Date picker
gem 'fuelux-rails-sass'           # Fuel UX components
gem 'best_in_place'               # in-place editing

group :development, :test do
  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug'

  # Access an IRB console on exception pages or by using <%= console %> in views
  gem 'web-console', '~> 2.0'

  # Use sqlite3 as the database for Active Record
  gem 'sqlite3'

  # Windows does not include zoneinfo files, so bundle the tzinfo-data gem
  gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw, :jruby]
end

group :development do
  gem 'faker'
  gem 'ruby-debug-ide'
  gem 'debase'
end

group :test do
  gem 'minitest-reporters'
  gem 'mini_backtrace'
  gem 'listen', '~> 2.10.1'
  gem 'guard'
  gem 'guard-minitest'
end

group :production, :staging do
  gem 'pg'
  gem 'rails_12factor'
  gem 'puma'
end

ruby '2.1.8'