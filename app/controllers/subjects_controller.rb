class SubjectsController < ApplicationController
  before_action :find_subject, only: :show
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
    respond_to do |format|
      if @subject.update(subject_params)
          grant_reputation_for!(:edited_subject)
          format.html {redirect_to @subject}
          format.json {respond_with_bip @subject }
      else
          format.html {render action: :edit}
          format.json {respond_with_bip @subject }
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
      if !current_user
        store_location
        flash[:danger] = "Vous devez être identifié pour éditer un sujet"
        redirect_to login_url
      elsif ! allowed_to? :edit_subject
        flash[:danger] = "Vous n'avez pas assez de réputation pour éditer un sujet"
        redirect_to(Subject.find(params[:id]))
      end
    end

    def auth_to_destroy
      if !current_user
        store_location
        flash[:danger] = "Vous devez être identifié pour supprimer un sujet"
        redirect_to login_url
      elsif ! allowed_to? :delete_minor_subject
        flash[:danger] = "Vous n'avez pas assez de réputation pour supprimer un sujet"
        redirect_to(Subject.find(params[:id]))
      end
    end

    def find_subject
      @subject = Subject.find params[:id]
      if request.path != subject_path(@subject)             # If old URL
        redirect_to @subject, status: :moved_permanently    # Redirect to new URL
      end
    end
end
