-- Create enum for question types
CREATE TYPE question_type AS ENUM ('multiple-choice', 'fill-blank', 'short-answer');

-- Create enum for quiz status
CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');

-- Create enum for attempt status
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'graded');

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  status quiz_status NOT NULL DEFAULT 'draft',
  allow_multiple_attempts BOOLEAN NOT NULL DEFAULT false,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  show_results_immediately BOOLEAN NOT NULL DEFAULT false,
  require_seb BOOLEAN NOT NULL DEFAULT false,
  seb_config_key TEXT, -- SEB Config Key for validation
  seb_browser_exam_key TEXT, -- SEB Browser Exam Key
  seb_quit_url TEXT,
  max_attempts INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB, -- For multiple choice options
  correct_answer TEXT, -- Store correct answer(s)
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  has_image BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous attempts
  student_name TEXT, -- For anonymous attempts
  student_email TEXT, -- For anonymous attempts  
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_spent INTEGER, -- seconds
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  is_seb_session BOOLEAN NOT NULL DEFAULT false,
  seb_session_data JSONB, -- Store SEB validation data
  access_token TEXT UNIQUE, -- For secure anonymous access
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attempt answers table
CREATE TABLE public.attempt_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  points_earned NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one answer per question per attempt
  UNIQUE(attempt_id, question_id)
);

-- Enable Row Level Security
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quizzes
CREATE POLICY "Users can view published quizzes" 
ON public.quizzes 
FOR SELECT 
USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "Users can create their own quizzes" 
ON public.quizzes 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own quizzes" 
ON public.quizzes 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own quizzes" 
ON public.quizzes 
FOR DELETE 
USING (created_by = auth.uid());

-- Create RLS policies for questions
CREATE POLICY "Users can view questions for accessible quizzes" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = questions.quiz_id 
    AND (quizzes.status = 'published' OR quizzes.created_by = auth.uid())
  )
);

CREATE POLICY "Users can manage questions for their own quizzes" 
ON public.questions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = questions.quiz_id 
    AND quizzes.created_by = auth.uid()
  )
);

-- Create RLS policies for quiz attempts
CREATE POLICY "Users can view their own attempts" 
ON public.quiz_attempts 
FOR SELECT 
USING (user_id = auth.uid() OR access_token IS NOT NULL);

CREATE POLICY "Users can create attempts for published quizzes" 
ON public.quiz_attempts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = quiz_attempts.quiz_id 
    AND quizzes.status = 'published'
  )
);

CREATE POLICY "Users can update their own attempts" 
ON public.quiz_attempts 
FOR UPDATE 
USING (user_id = auth.uid() OR access_token IS NOT NULL);

CREATE POLICY "Quiz creators can view attempts on their quizzes" 
ON public.quiz_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = quiz_attempts.quiz_id 
    AND quizzes.created_by = auth.uid()
  )
);

-- Create RLS policies for attempt answers
CREATE POLICY "Users can manage answers for their attempts" 
ON public.attempt_answers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts 
    WHERE quiz_attempts.id = attempt_answers.attempt_id 
    AND (quiz_attempts.user_id = auth.uid() OR quiz_attempts.access_token IS NOT NULL)
  )
);

CREATE POLICY "Quiz creators can view answers on their quizzes" 
ON public.attempt_answers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    JOIN public.quizzes q ON qa.quiz_id = q.id
    WHERE qa.id = attempt_answers.attempt_id 
    AND q.created_by = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX idx_quizzes_status ON public.quizzes(status);
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_questions_order ON public.questions(quiz_id, order_index);
CREATE INDEX idx_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_attempts_token ON public.quiz_attempts(access_token);
CREATE INDEX idx_answers_attempt_id ON public.attempt_answers(attempt_id);

-- Create function to generate secure access tokens
CREATE OR REPLACE FUNCTION public.generate_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamps
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attempt_answers_updated_at
BEFORE UPDATE ON public.attempt_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();