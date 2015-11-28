require 'test_helper'

class SubjectTest < ActiveSupport::TestCase

  def setup
    @subject = Subject.new(title: 'Nouveau sujet', presentation: 'Long text here', problem: 'problem here')
  end

  test 'should be valid' do
    assert @subject.valid?
  end

  test 'title should be present' do
    @subject.title = '         '
    assert_not @subject.valid?
  end

  test 'presentation should be present' do
    @subject.presentation = '           '
    assert_not @subject.valid?
  end

  test 'title should not be too long' do
    @subject.title = 'a' * 101
    assert_not @subject.valid?
  end

  test 'title should be unique' do
    dup_subject = @subject.dup
    dup_subject.title = @subject.title.upcase
    @subject.title.downcase!
    @subject.save
    assert_not dup_subject.valid?
  end

  test 'associated positions should be destroyed on destroy' do
    @subject.save
    @subject.positions.create!(title: 'test pos', description: 'test')
    assert_difference 'Position.count', -1 do
      @subject.destroy
    end
  end

  test 'slug should be correct' do
    @subject.valid?
    assert_equal 'nouveau-sujet', @subject.slug
  end


  test "slug cannot be 'edit'" do
    subject = Subject.new(title: 'edit', presentation: 'edit', problem: 'problem here')
    assert_not subject.valid?
  end

  test "slug can be 'edite'" do
    subject = Subject.new(title: 'edite', presentation: 'edit', problem: 'problem here')
    assert subject.valid?
    assert_equal 'edite', subject.slug
  end

end
