require 'spec_helper'
require 'colored'

feature "UI tests" do

    scenario "Unit tests all pass", js: true do
        visit '/test/unit'

        using_wait_time 300 do
            page.should have_selector('.result')
        end

        if page.find('.result .failed').text.to_i > 0
            puts "Some unit tests failed.".red

            STOP_ON_FAILING_TEST = "STOP_ON_FAILING_TEST"
            if ENV[STOP_ON_FAILING_TEST]
                puts "Press <RETURN> to terminate tests...".blue
                STDIN.getc
            else
                puts "HINT: Set #{STOP_ON_FAILING_TEST} environment variable to keep browser opened.".red
            end
        end

        within '.result' do
            page.should have_selector('.failed', text: '0')
        end
    end
end
