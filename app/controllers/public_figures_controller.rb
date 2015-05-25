class PublicFiguresController < ApplicationController

  def index
    @public_figures = PublicFigure.paginate(page: params[:page])
    @latest_statements = Statement.latest
  end

end
