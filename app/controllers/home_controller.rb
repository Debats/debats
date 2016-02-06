class HomeController < ApplicationController
  def home
    @subjects = Subject.paginate(page: params[:page])
    @public_figures = PublicFigure.paginate(page: params[:page])
    @latest_statements = Statement.latest
  end
end
