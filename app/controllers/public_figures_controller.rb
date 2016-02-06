class PublicFiguresController < ApplicationController
  before_action :find_public_figure, only: :show

  def index
    @public_figures = PublicFigure.paginate(page: params[:page])
    @latest_statements = Statement.latest
  end

  def show
    @public_figure = PublicFigure.find(params[:id])
    @new_statement = @public_figure.statements.build
  end

  def new
    @public_figure = PublicFigure.new
  end

  def create
    @public_figure = PublicFigure.new(public_figure_params)
    if @public_figure.save
      flash[:success] = "Personnalité \"#{@public_figure.name}\" créé ! "
      redirect_to @public_figure
    else
      render "new"
    end
  end

  def destroy
    public_figure = PublicFigure.find(params[:id])
    name = public_figure.name
    public_figure.destroy  #TODO Mark deleted instead of really deleting record
    flash[:success] = "\"#{name}\" supprimé"
    redirect_to public_figures_url
  end

  private

  def public_figure_params
    params.require(:public_figure).permit(:name, :presentation, :picture)
  end

  def check_reputation_to_destroy
    if !current_user
      store_location
      flash[:danger] = "Vous devez être identifié pour supprimer une personnalité"
      redirect_to login_url
    elsif allowed_to? :delete_public_figure
      flash[:danger] = "Vous n'avez pas assez de réputation pour supprimer une personnalité"
      redirect_to(PublicFigure.find(params[:id]))
    end
  end

  def find_public_figure
    @public_figure = PublicFigure.find params[:id]
    if request.path != public_figure_path(@public_figure)       # If old URL
      redirect_to @public_figure, status: :moved_permanently    # Redirect to new URL
    end
  end

end
