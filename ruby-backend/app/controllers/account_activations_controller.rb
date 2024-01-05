class AccountActivationsController < ApplicationController

  def edit
    user = User.find_by_email(params[:email])
    if user && !user.activated && user.authenticated?(:activation, params[:id])
      user.activate
      log_in(user)
      flash[:success] = "Votre compte a été activé. "
      redirect_to user
    else
      if user && user.activated? # User already activated
        flash[:warning] = "Votre compte a déjà été activé. "
      else              # Non-existent user with this e-mail or invalid token
        flash[:danger] = "Lien d'activation incorrect. "
      end
      redirect_to root_url
    end
  end

end
