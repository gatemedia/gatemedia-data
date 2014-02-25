# A sample Guardfile
# More info at https://github.com/guard/guard#readme

guard 'livereload' do
  watch(%r{tests/app/views/.+\.(erb|haml|slim)$})
  watch(%r{tests/app/helpers/.+\.rb})
  watch(%r{tests/public/.+\.(css|js|html)})
  watch(%r{tests/config/locales/.+\.yml})
  # Rails Assets Pipeline
  watch(%r{(app|vendor)(/assets/\w+/(.+\.(css|js|html))).*}) { |m| "/assets/#{m[3]}" }
  watch(%r{tests/(app|vendor)(/assets/\w+/(.+\.(css|js|html))).*}) { |m| "/assets/#{m[3]}" }
end
