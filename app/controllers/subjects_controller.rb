class SubjectsController < ApplicationController
  before_action :reputation_to_destroy, only: :destroy

  def index
    @subjects = Subject.paginate(page: params[:page])
    @latest_statements = Statement.latest
  end

  def show
    @subject = Subject.find(params[:id])
    @new_position = @subject.positions.build
  end

  def new
    @subject = Subject.new
  end

  def create
    @subject = Subject.new(subject_params)
    if @subject.save
      flash[:success] = "Sujet \"#{@subject.title}\" créé ! "
      redirect_to @subject
    else
      render "new"
    end
  end

  def destroy
    subject = Subject.find(params[:id])
    title = subject.title
    subject.destroy
    flash[:success] = "Sujet \"#{title}\" supprimé"
    redirect_to subjects_url
  end

  private

  def subject_params
    params.require(:subject).permit(:title, :presentation)
  end

  def reputation_to_destroy
    if !current_user
      store_location
      flash[:danger] = "Vous devez être identifié pour supprimer un sujet"
      redirect_to login_url
    elsif current_user.reputation < 1000
      flash[:danger] = "Vous n'avez pas assez de réputation pour supprimer un sujet"
      redirect_to(Subject.find(params[:id]))
    end
  end
end
