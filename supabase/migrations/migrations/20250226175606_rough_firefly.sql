/*
  # Add schools table and update schema for multi-role auth

  1. New Tables
    - `schools`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `class_level` (integer)
      - `sub_class` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `schools` table
    - Add policies for authenticated users to read their own data
    - Add policy for viewing assignments based on class level
*/

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  class_level integer NOT NULL,
  sub_class text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add class_level to assignments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'class_level'
  ) THEN
    ALTER TABLE assignments ADD COLUMN class_level integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Policies for schools
CREATE POLICY "Schools can view their own profile"
  ON schools
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Schools can update their own profile"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Update assignments policy for schools
CREATE POLICY "Schools can view assignments for their class"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = auth.uid()
      AND schools.class_level = assignments.class_level::integer
    )
  );