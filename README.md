# HOW TO INSTALL

#### Dependencies

###### Windows
- Install [Ruby](https://www.ruby-lang.org/fr/downloads/) (>= 2.0.0)
- Install et init [Ruby Devkit](http://rubyinstaller.org/add-ons/devkit/) (Windows)

###### macOs
```shell
brew update
brew install rbenv ruby-build
echo 'eval $(rbenv init -)' >> $HOME/.zshrc # assuming you're on zsh
source ~/.zshrc
brew install postgresql # for libpq-fe
xcode-select --install # click, click, click
```

#### Project Init
```shell
git clone https://github.com/Tiqa/debats-api.git
git checkout -b feat/api_mode origin/feat/api_mode
cd debats-api
gem install bundler
gem install pg
#gem install nokogiri
bundler config build.nokogiri --use-system-libraries # macOS issue
bundler install
rails db:drop
rails db:create
rails db:migrate
rails db:seed
```

#### Launch server
```shell
rails server # /usr/local/bin/rails server (macOS)
```
> server launched on port 3000
