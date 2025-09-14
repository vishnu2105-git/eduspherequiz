import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealPDFParser } from "./realPdfParser";

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
  static async importQuizFromPDF(
    pdfFile: File,
    quizTitle?: string,
    quizDescription?: string,
    duration?: number,
    password?: string,
    publishImmediately?: boolean
  ): Promise<string> {
    try {
      toast.loading("Processing PDF...");

      // Use real PDF parser
      const parsedQuiz = await RealPDFParser.parseQuizFromPDF(
        pdfFile,
        quizTitle,
        quizDescription
      );
      
      // Update duration if provided
      if (duration) {
        parsedQuiz.duration = duration;
      }
      
      // Create quiz using the real parser
      const quizId = await RealPDFParser.createQuizFromParsedData(
        parsedQuiz,
        publishImmediately || false,
        password
      );

      toast.dismiss();
      const message = publishImmediately 
        ? `Quiz published with ${parsedQuiz.questions.length} questions!`
        : `Quiz imported successfully with ${parsedQuiz.questions.length} questions!`;
      
      toast.success(message, {
        duration: 5000,
        action: publishImmediately ? {
          label: 'Open Direct Link',
          onClick: () => {
            const directUrl = `${window.location.origin}/quiz/${quizId}/direct`;
            navigator.clipboard.writeText(directUrl);
            toast.success('Direct link copied to clipboard!');
            window.open(directUrl, '_blank');
          }
        } : undefined
      });
      
      return quizId;
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