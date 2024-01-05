class ArgumentsController < ApplicationController
  before_action :auth_to_create, only: :create

  def create
    @argument = Argument.new(argument_params)
    respond_to do |format|
      if @argument.save
        format.html { redirect_to root_url }
        format.json {render json: @argument}
      else
        format.html { redirect_to root_url}
        format.json { render json: @argument.errors }
      end
    end
  end

  private

    def argument_params
      params.permit(:name)
    end

    def auth_to_create
      if ! redirect_not_logged_with_message "Vous devez être identifié pour créer un argument"
        if ! allowed_to? :add_argument
          render text: "Vous n'avez pas assez de réputation pour ajouter un argument", status: 500
        end
      end
    end

end
