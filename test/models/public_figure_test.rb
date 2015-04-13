require 'test_helper'

class PublicFigureTest < ActiveSupport::TestCase

  def setup
    @pfigure = PublicFigure.new(title: "Socrate", presentation: "Socrate est un homme,les hommes sont mortels,donc socrate est mortel", wikipedia_url: "http://fr.wikipedia.org/wiki/Socrate", website_url: "")
  end

end
