-- Create storage bucket for quiz images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true);

-- RLS policies for storage
CREATE POLICY "Public read access to quiz images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quiz-images');

CREATE POLICY "Authenticated admin can upload quiz images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quiz-images' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated admin can update quiz images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quiz-images' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated admin can delete quiz images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quiz-images' AND
  has_role(auth.uid(), 'admin')
);