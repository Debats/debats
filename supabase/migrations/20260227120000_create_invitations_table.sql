-- Invitations table for the invitation system
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  invitee_name VARCHAR(100) NOT NULL,
  invitee_id UUID REFERENCES contributors(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE UNIQUE INDEX idx_invitations_unique_pending_email
  ON invitations(invitee_email) WHERE status = 'pending';

-- updated_at trigger
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: read-only for inviter (all writes go through admin client)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters read own invitations" ON invitations
  FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id);
