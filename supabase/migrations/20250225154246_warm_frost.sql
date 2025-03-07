/*
  # Education Platform Schema

  1. New Tables
    - `teachers`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
    
    - `assignments`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `subject` (text)
      - `teacher_id` (uuid, foreign key)
      - `deadline` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create teachers table
CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create assignments table
CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  teacher_id uuid REFERENCES teachers(id) NOT NULL,
  deadline timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policies for teachers
CREATE POLICY "Teachers can view their own profile"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Teachers can update their own profile"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies for assignments
CREATE POLICY "Anyone can view assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create assignments"
  ON assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own assignments"
  ON assignments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Create enum type for subjects
CREATE TYPE subject_type AS ENUM ('Mathematics', 'German', 'English', 'Science', 'History', 'Art');

-- Add some initial subjects
ALTER TABLE assignments 
  ALTER COLUMN subject TYPE subject_type USING subject::subject_type;