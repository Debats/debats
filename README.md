# HOW TO INSTALL

#### Dependencies

###### Windows
- Install [Ruby](https://www.ruby-lang.org/fr/downloads/) (>= 2.0.0)
- Install et init [Ruby Devkit](http://rubyinstaller.org/add-ons/devkit/) (Windows)

###### macOs
```shell
brew update
brew install ruby
```

#### Project Init
```shell
git clone https://github.com/Tiqa/debats-api.git
cd debats-api
gem install bundler
bundler install
rails db:reset
```

#### Launch server
```shell
rails server
```
> server launched on port 3000
