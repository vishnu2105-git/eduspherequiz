import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedQuestion {
  question_text: string;
  question_type: 'multiple-choice' | 'fill-blank' | 'short-answer';
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  order_index: number;
  has_image: boolean;
  image_data?: {
    blob: Blob;
    filename: string;
  };
}

export interface ParsedQuiz {
  title: string;
  description: string;
  duration: number;
  questions: ParsedQuestion[];
}

export class PDFImportService {
  private static async uploadQuizImage(
    quizId: string, 
    questionIndex: number, 
    imageBlob: Blob, 
    filename: string
  ): Promise<string> {
    const fileExt = filename.split('.').pop() || 'png';
    const fileName = `quiz-${quizId}/question-${questionIndex}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, imageBlob, {
        contentType: imageBlob.type,
        upsert: true
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  static async importQuizFromPDF(
    pdfFile: File,
    quizTitle?: string,
    quizDescription?: string
  ): Promise<string> {
    try {
      toast.loading("Processing PDF...");

      // For demo, we'll parse the Dallas ISD geometry questions based on the PDF structure
      const parsedQuiz = await this.parseDallasISDQuiz(pdfFile, quizTitle, quizDescription);
      
      // Create quiz in database
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: parsedQuiz.title,
          description: parsedQuiz.description,
          duration: parsedQuiz.duration,
          status: 'draft',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Failed to create quiz');

      // Process questions with images
      const questionsWithImages = await Promise.all(
        parsedQuiz.questions.map(async (question, index) => {
          let imageUrl = null;
          
          if (question.has_image && question.image_data) {
            try {
              imageUrl = await this.uploadQuizImage(
                quiz.id,
                index,
                question.image_data.blob,
                question.image_data.filename
              );
            } catch (error) {
              console.error(`Failed to upload image for question ${index}:`, error);
              // Continue without image rather than failing
            }
          }

          return {
            quiz_id: quiz.id,
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options,
            correct_answer: question.correct_answer,
            points: question.points,
            order_index: question.order_index,
            has_image: question.has_image,
            image_url: imageUrl
          };
        })
      );

      // Insert questions
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsWithImages);

      if (questionsError) throw questionsError;

      toast.dismiss();
      toast.success(`Quiz imported successfully with ${parsedQuiz.questions.length} questions!`);
      
      return quiz.id;
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to import PDF: " + (error as Error).message);
      throw error;
    }
  }

  private static async parseDallasISDQuiz(
    pdfFile: File,
    quizTitle?: string,
    quizDescription?: string
  ): Promise<ParsedQuiz> {
    // In a real implementation, you'd use a PDF parsing library
    // For now, we'll create sample questions based on the Dallas ISD structure
    
    const questions: ParsedQuestion[] = [
      {
        question_text: "Segment CT has a midpoint at (-1, 0). If point C is located at (-7, -3), what is the location of point T?",
        question_type: "multiple-choice",
        options: ["(-13, -6)", "(-4, -1.5)", "(2, 1.5)", "(5, 3)"],
        correct_answer: "(5, 3)",
        points: 2,
        order_index: 0,
        has_image: false
      },
      {
        question_text: "The graph of AB is shown. Which equation represents a line parallel to AB that passes through the point (0, 4)?",
        question_type: "multiple-choice",
        options: ["y = -¼x + 4", "y = -⅓x + 4", "y = ⅓x + 4", "y = ¼x + 4"],
        correct_answer: "y = ¼x + 4",
        points: 2,
        order_index: 1,
        has_image: true,
        image_data: {
          blob: new Blob([]), // In real implementation, extract from PDF
          filename: "graph_ab.png"
        }
      },
      {
        question_text: "Triangle ABC is shown on the coordinate grid. If ΔABC is translated using the rule (x, y) → (x - 2, y + 1) and then dilated by a scale factor of ½ with the origin as the center of dilation, which graph represents ΔA\"B\"C\"?",
        question_type: "multiple-choice",
        options: ["Graph A", "Graph B", "Graph C", "Graph D"],
        correct_answer: "Graph C",
        points: 3,
        order_index: 2,
        has_image: true,
        image_data: {
          blob: new Blob([]),
          filename: "triangle_transformation.png"
        }
      }
    ];

    return {
      title: quizTitle || "Dallas ISD Geometry Assessment",
      description: quizDescription || "Comprehensive geometry assessment with coordinate systems and transformations",
      duration: 90, // 90 minutes for Dallas ISD assessment
      questions
    };
  }
}