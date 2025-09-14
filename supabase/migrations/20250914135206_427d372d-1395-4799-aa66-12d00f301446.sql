-- Create storage bucket for quiz images
INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-images', 'quiz-images', true);

-- Create storage policies for quiz images
CREATE POLICY "Quiz images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'quiz-images');

CREATE POLICY "Authenticated users can upload quiz images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'quiz-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Quiz creators can manage their quiz images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'quiz-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Quiz creators can delete their quiz images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'quiz-images' AND auth.uid() IS NOT NULL);

-- Add password protection fields to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN password_protected boolean NOT NULL DEFAULT false,
ADD COLUMN access_password text;

-- Set default values for student info fields in quiz_attempts
ALTER TABLE public.quiz_attempts 
ALTER COLUMN student_name SET DEFAULT '',
ALTER COLUMN student_email SET DEFAULT '';

-- Update quiz_attempts RLS policy for anonymous access with password
DROP POLICY IF EXISTS "Users can create attempts for published quizzes" ON public.quiz_attempts;
CREATE POLICY "Users can create attempts for published quizzes" 
ON public.quiz_attempts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quizzes 
    WHERE quizzes.id = quiz_attempts.quiz_id 
    AND quizzes.status = 'published'::quiz_status
  )
);