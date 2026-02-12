-- Rename user_profiles to contributors and drop redundant name column

-- Drop existing policies
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Rename the table
ALTER TABLE user_profiles RENAME TO contributors;

-- Drop name column (redundant with auth.users.raw_user_meta_data)
ALTER TABLE contributors DROP COLUMN name;

-- Recreate trigger with new name
CREATE TRIGGER update_contributors_updated_at
  BEFORE UPDATE ON contributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recreate RLS policies
CREATE POLICY "Contributors read own profile" ON contributors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Contributors update own profile" ON contributors
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserting own profile (needed for signup)
CREATE POLICY "Contributors insert own profile" ON contributors
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
