class SubjectsController < ApplicationController

  def index
    @subjects = Subject.all
  end

  def show
    @subject = Subject.find(params[:id])
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

  private

  def subject_params
    params.require(:subject).permit(:title, :presentation)
  end
end
