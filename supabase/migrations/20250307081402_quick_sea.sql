/*
  # Create notifications table and policies

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `message` (text, required)
      - `teacher_id` (uuid, references teachers)
      - `school_id` (uuid, references schooltowns)
      - `class_level` (text)
      - `subclass` (text)
      - `read` (boolean, default false)
      - `created_at` (timestamp with time zone)
      - `teacher_full_name` (text)
      - `teacher_avatar_url` (text)

  2. Security
    - Enable RLS on notifications table
    - Add policies for:
      - Students can read notifications for their class
      - Teachers can create notifications
      - Teachers can read their own notifications
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  teacher_id uuid REFERENCES teachers(id),
  school_id uuid REFERENCES schooltowns(id),
  class_level text,
  subclass text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  teacher_full_name text,
  teacher_avatar_url text
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for students to read notifications for their class
CREATE POLICY "Students can read notifications for their class"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = auth.uid()
      AND schools.class_level::text = notifications.class_level
      AND schools.sub_class = notifications.subclass
    )
  );

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