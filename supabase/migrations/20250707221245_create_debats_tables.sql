-- Debats.co - Core tables migration
-- Auth: Supabase auth.users + custom user_profiles
-- Authorization: Simple reputation-based in domain logic

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  reputation INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  presentation TEXT NOT NULL,
  problem TEXT NOT NULL,
  picture_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Public figures table
CREATE TABLE public_figures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  presentation TEXT NOT NULL,
  wikipedia_url TEXT,
  website_url TEXT,
  picture_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table (positions possibles sur un sujet)
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Statements table (prises de position concretes)
CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_figure_id UUID NOT NULL REFERENCES public_figures(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Une personnalite ne peut avoir qu'une prise de position par position
  UNIQUE(public_figure_id, position_id)
);

-- Evidences table (preuves d'une prise de position)
CREATE TABLE evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_url TEXT,
  quote TEXT NOT NULL,
  fact_date DATE NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Arguments table
CREATE TABLE arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for arguments and statements
CREATE TABLE argument_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(argument_id, statement_id)
);

-- Indexes for performance
CREATE INDEX idx_subjects_slug ON subjects(slug);
CREATE INDEX idx_public_figures_slug ON public_figures(slug);
CREATE INDEX idx_positions_subject_id ON positions(subject_id);
CREATE INDEX idx_statements_public_figure_id ON statements(public_figure_id);
CREATE INDEX idx_statements_position_id ON statements(position_id);
CREATE INDEX idx_evidences_statement_id ON evidences(statement_id);
CREATE INDEX idx_arguments_subject_id ON arguments(subject_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_public_figures_updated_at BEFORE UPDATE ON public_figures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evidences_updated_at BEFORE UPDATE ON evidences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_arguments_updated_at BEFORE UPDATE ON arguments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Basic RLS policies (security only, no business logic)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_statements ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read" ON public_figures FOR SELECT USING (true);
CREATE POLICY "Public read" ON positions FOR SELECT USING (true);
CREATE POLICY "Public read" ON statements FOR SELECT USING (true);
CREATE POLICY "Public read" ON evidences FOR SELECT USING (true);
CREATE POLICY "Public read" ON arguments FOR SELECT USING (true);
CREATE POLICY "Public read" ON argument_statements FOR SELECT USING (true);

-- Authenticated users can write
CREATE POLICY "Authenticated write" ON subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON public_figures FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON positions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON statements FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON evidences FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON arguments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated write" ON argument_statements FOR ALL TO authenticated USING (true);

-- User profiles: users can only update their own
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);