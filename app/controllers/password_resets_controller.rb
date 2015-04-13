class PasswordResetsController < ApplicationController
  before_action     :valid_user,        only:[:edit, :update]
  before_action     :check_expiration,  only:[:edit, :update]

  def new
  end

  def create
    @user = User.find_by_email(params[:password_reset][:email].downcase)
    if @user
      @user.create_reset_digest
      @user.send_password_reset_email
      flash[:info] = "Un e-mail vous a été envoyé. Veuillez en suivre les instructions pour créer un nouveau mot de passe. "
      redirect_to root_url
    else
      flash.now[:danger] = "Aucun utilisateur avec cette adresse e-mail. Veuillez vérifier votre saisie. "
      render "new"
    end
  end

  def edit

  end

  def update
    if params[:user][:password].blank?
      flash.now[:danger] = "Vous devez choisir un mot de passe"
      render "edit"
    elsif @user.update_attributes(params.require(:user).permit(:password, :password_confirmation))
      log_in @user
      flash[:success] = "Nouveau mot de passe enregistré !"
      redirect_to @user
    else # Could not save new password (check validations)
      render "edit"
    end
  end

  private

    def valid_user
      @user = User.find_by_email(params[:email])
      unless (@user && @user.activated? && @user.authenticated?(:reset, params[:id]))
        flash[:danger] = "Lien incorrect."
        redirect_to root_url
      end
    end

    def check_expiration
      if @user.password_reset_expired?
        flash[:danger] = "Lien expiré. Veuillez renouveller votre demande. "
        redirect_to new_password_reset_url
      end
    end
end
