REPUTATION_CONFIG = Rails.application.config_for(:reputation)

Dir[File.join(Rails.root, "lib", "core_ext", "*.rb")].each {|l| require l }