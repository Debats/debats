class PositionsController < ApplicationController
  before_action :logged_in_user, only: [:create, :update, :destroy]
  before_action :existing, only: [:update, :destroy]

  def create
    @subject = Subject.find_by_id(position_params[:subject_id])
    if @subject
      @position = @subject.positions.build(position_params)
      if @position.save
        flash[:success] = "Position ajoutée !"
      else
        flash[:danger] = pluralize(@position.errors.count, "erreur") + " : " + @position.errors.full_messages.join(", ")
      end
      redirect_to subject_url(@subject)
    end
  end

  def index
    @positions = Position.where(subject_id: params[:id]).order(:title).all

    respond_to do |format|
      format.json { render json: @positions }
    end
  end

  def update

  end

  def destroy
    @subject = @position.subject
    @position.destroy
    flash[:success] = "Position supprimée !"
    redirect_to request.referrer || @subject
  end

  private

    def position_params
      params.require(:position).permit(:title, :description, :subject_id)
    end

    def existing
      @position = Position.find_by id:params[:id]
      redirect_to root_url if @position.nil?
    end

end
