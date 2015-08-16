class SubjectsController < ApplicationController
  before_action :auth_to_destroy, only: :destroy
  before_action :auth_to_update, only: :update

  def index
    @subjects = Subject.paginate(page: params[:page])
    @latest_statements = Statement.latest
  end

  def show
    @subject = Subject.find(params[:id])
    @new_position = @subject.positions.build
    respond_to do |format|
      format.html
      format.json {render json: @subject}
    end
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

  def update
    @subject = Subject.find(params[:id])
    if @subject.update_attributes!(subject_params)
      respond_to do |format|
        format.html {redirect_to @subject}
        format.json {render json: @subject}
      end
    else
      respond_to do |format|
        format.html {render action: :edit}
        format.json {render nothing: true }
      end
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
    params.require(:subject).permit(:title, :presentation, :problem, :picture)
  end

  def auth_to_update

  end

  def auth_to_destroy
    if !current_user
      store_location
      flash[:danger] = "Vous devez être identifié pour supprimer un sujet"
      redirect_to login_url
    elsif ! allowed_to :delete_subject
      flash[:danger] = "Vous n'avez pas assez de réputation pour supprimer un sujet"
      redirect_to(Subject.find(params[:id]))
    end
  end
end
