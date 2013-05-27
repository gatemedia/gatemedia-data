require 'spec_helper'

feature "UI tests" do

    scenario "Unit tests all pass", js: true do
        visit '/test/unit'

        using_wait_time 300 do
            page.should have_selector('.result')
        end

STDIN.getc
        within '.result' do
            page.should have_selector('.failed', text: '0')
        end
    end
end
