import { supabase } from "@/integrations/supabase/client";

export class ImageUploadService {
  static async uploadQuestionImage(
    quizId: string, 
    questionId: string, 
    file: File
  ): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `quiz-${quizId}/question-${questionId}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    return this.getImageUrl(fileName);
  }

  static getImageUrl(fileName: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }

  static async deleteQuestionImage(fileName: string): Promise<void> {
    const { error } = await supabase.storage
      .from('quiz-images')
      .remove([fileName]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  static getImageFileName(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return decodeURIComponent(fileName);
    } catch {
      return null;
    }
  }
}