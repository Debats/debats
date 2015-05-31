class StatementsController < ApplicationController
  before_action :logged_in_user, only: [:create, :update, :destroy]

  def create
    @position = Position.find_by_id(statement_params[:position_id])
    @public_figure = PublicFigure.find_by_id(statement_params[:public_figure_id])

    if @position && @public_figure
      @statement = @position.statements.build(statement_params)
      @evidence = @statement.evidences.build(statement_evidence_params)

      if ( @evidence.valid? && @statement.valid?  )
        if @statement.save && @evidence.save
          flash[:success] = "Prise de position et preuve enregistrées !"
        else
          flash[:danger] = pluralize( @statement.errors.count + @evidence.errors.count , "erreur") + " : " +
              (@statement.errors.full_messages + @evidence.errors.full_messages).join(", ")
        end
      else
        flash[:danger] = pluralize( @statement.errors.count + @evidence.errors.count , "erreur") + " : " +
            (@statement.errors.full_messages + @evidence.errors.full_messages).join(", ")
      end

    else
      flash[:danger] = "Une prise de position doit correspondre à une personnalité et à une position. "
    end
    redirect_to request.referrer || @position

  end

  def update

  end

  def destroy

  end


  private

    def statement_params
      params.require(:statement).permit(:position_id, :public_figure_id)
    end

    def statement_evidence_params
      params.require(:statement).require(:evidence).permit(:title, :url, :file, :evidence_date, :fact_date)
    end

end
