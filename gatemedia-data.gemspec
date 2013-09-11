$:.push File.expand_path("../lib", __FILE__)

# Maintain your gem's version:
require "gatemedia-data/version"

# Describe your gem and declare its dependencies:
Gem::Specification.new do |s|
  s.name        = "gatemedia-data"
  s.version     = GatemediaData::VERSION
  s.authors     = ["Mike Aski"]
  s.email       = ["mike.aski@gatemedia.ch"]
  s.homepage    = "http://www.gatemedia.ch"
  s.summary     = "Ember.js Data model library."
  s.description = "Provides support for Ember's object-model based data model & connection to API back-end facilities."

  s.files = Dir["{app,config,db,lib}/**/*"] + ["MIT-LICENSE", "Rakefile", "README.md"]
  s.test_files = Dir["test/**/*"]

  s.add_dependency "rails", ">= 3.2.14"

  s.add_development_dependency "sqlite3"
  s.add_development_dependency "colored"
  s.add_development_dependency "rspec-rails", "~> 2.0"
  s.add_development_dependency "capybara"
end
