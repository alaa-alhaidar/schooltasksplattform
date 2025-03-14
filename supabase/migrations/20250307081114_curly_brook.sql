/*
  # Add notifications table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `message` (text, required)
      - `teacher_id` (uuid, foreign key to teachers)
      - `created_at` (timestamp)
      - `school_id` (uuid, foreign key to schooltowns)
      - `class_level` (text)
      - `subclass` (text)
      - `read` (boolean)

  2. Security
    - Enable RLS on `notifications` table
    - Add policies for teachers to create notifications
    - Add policies for students to read notifications
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  teacher_id uuid REFERENCES teachers(id),
  created_at timestamptz DEFAULT now(),
  school_id uuid REFERENCES schooltowns(id),
  class_level text,
  subclass text,
  read boolean DEFAULT false,
  teacher_full_name text,
  teacher_avatar_url text
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to create notifications
CREATE POLICY "Teachers can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

-- Policy for teachers to read their own notifications
CREATE POLICY "Teachers can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Policy for students to read notifications for their class
CREATE POLICY "Students can read notifications for their class"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IN (
      SELECT id FROM schools 
      WHERE class_level::text = notifications.class_level 
      AND subclass = notifications.subclass
    ))
  );