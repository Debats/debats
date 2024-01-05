class AutocompleteController < ApplicationController

  autocomplete :subject, :title, full: true, extra_data: [:presentation]

  autocomplete :public_figure, :name, full: true

  def autocomplete_position_title
    term = params[:term]
    subject_id = params[:subject_id]
    positions = Position
                    .where(subject_id: subject_id)
                    .where("title LIKE ?", "%#{term}%")
                    .order(:title)
                    .all
    render json: positions.map { |position| { id: position.id, title: position.title, value: position.title } }
  end

end
