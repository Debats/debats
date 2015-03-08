class SessionsController < ApplicationController
  def new
  end

  def create
    user = User.find_by_email(params[:session][:email].downcase.strip)
    if user && user.authenticate(params[:session][:password])
      log_in user
      redirect_to user
    else
      flash.now[:danger] = "Veuillez vérifier votre courriel et/ou votre mot de passe"
      render "new"
    end
  end

  def destroy

  end
end
