# HOW TO INSTALL

### Dependencies

###### Windows
- Install [Ruby](https://www.ruby-lang.org/fr/downloads/) (2.2.4)
- Install et init [Ruby Devkit](http://rubyinstaller.org/add-ons/devkit/)

###### macOs
```shell
# from terminal
brew update
brew install rbenv ruby-build postgresql # for libpq-fe
xcode-select --install # click, click, click
echo 'eval "$(rbenv init -)"' >> $HOME/.zshrc # assuming you're on zsh
source ~/.zshrc
```

### Project Init
```shell
# from terminal
git clone https://github.com/Tiqa/debats-api.git
cd debats-api
git checkout -b feat/api_mode origin/feat/api_mode
rbenv install 2.2.4
rbenv local 2.2.4 # or rbenv global 2.2.4
gem install bundler
gem install pg
#gem install nokogiri
bundler config build.nokogiri --use-system-libraries # macOS issue
bundler install
sudo gem install rails # on macOs
rbenv rehash
rails db:drop
rails db:create
rails db:migrate
rails db:seed
```

### Launch server
```shell
rails server
```
> server launched on port 3000
