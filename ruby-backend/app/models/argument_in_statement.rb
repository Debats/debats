class ArgumentInStatement < ActiveRecord::Base
    belongs_to :statement
    belongs_to :argument

    validates_uniqueness_of :argument_id, scope: :statement_id
end
