/*
  # Add students table and note field to assignments

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `created_at` (timestamp)
  
  2. Changes
    - Add `note` column to assignments table
  
  3. Security
    - Enable RLS on `students` table
    - Add policies for students to view their own profile
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add note column to assignments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'note'
  ) THEN
    ALTER TABLE assignments ADD COLUMN note text DEFAULT '';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
CREATE POLICY "Students can view their own profile"
  ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Students can update their own profile"
  ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Update assignments policy for students
CREATE POLICY "Students can view assignments for their class"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (true);

  CREATE POLICY "Enable read access for all users"
ON schooltowns FOR SELECT
USING (true);

CREATE POLICY "Allow public read access"
ON schooltowns
FOR SELECT
USING (true);

ALTER TABLE schooltowns DISABLE ROW LEVEL SECURITY;
