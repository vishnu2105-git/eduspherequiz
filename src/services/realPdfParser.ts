import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { toast } from "sonner";

// Configure local PDF.js worker (avoids CDN/CORS issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export interface ParsedQuestion {
  question_text: string;
  question_type: 'multiple-choice';
  options: string[];
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

export class RealPDFParser {
  static async parseQuizFromPDF(
    pdfFile: File | string,
    quizTitle?: string,
    quizDescription?: string
  ): Promise<ParsedQuiz> {
    try {
      let pdfData: ArrayBuffer;
      
      if (typeof pdfFile === 'string') {
        // URL to PDF file
        const response = await fetch(pdfFile);
        pdfData = await response.arrayBuffer();
      } else {
        // File object
        pdfData = await pdfFile.arrayBuffer();
      }

      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const questions: ParsedQuestion[] = [];
      
      // Parse each page looking for questions
      for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item) => item.str)
          .join(' ');

        // Look for question pattern: "# 1." or "1." at start
        const questionMatch = pageText.match(/(?:^|\s)#?\s*(\d+)\.\s*(.+?)(?=A\.|$)/s);
        if (!questionMatch) continue;

        const questionNum = parseInt(questionMatch[1]);
        const questionText = questionMatch[2].trim();

        if (!questionText) continue;

        // Extract options A, B, C, D
        const optionMatches = pageText.match(/[A-D]\.\s*([^A-D]*?)(?=[A-D]\.|$)/g);
        const options = optionMatches?.map(match => {
          const cleanOption = match.replace(/^[A-D]\.\s*/, '').trim();
          return cleanOption.replace(/\s+/g, ' ');
        }).filter(opt => opt.length > 0) || [];

        if (options.length !== 4) {
          console.warn(`Question ${questionNum}: Expected 4 options, found ${options.length}`);
        }

        // Render page as image
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;

        // Convert canvas to blob
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
        });

        questions.push({
          question_text: questionText,
          question_type: 'multiple-choice',
          options: options.length === 4 ? options : ['A', 'B', 'C', 'D'], // Fallback
          correct_answer: null, // Will be set manually
          points: 2,
          order_index: questionNum - 1,
          has_image: true,
          image_data: {
            blob: imageBlob,
            filename: `question_${questionNum}.png`
          }
        });
      }

      if (questions.length === 0) {
        throw new Error('No questions detected in the PDF. Ensure it has selectable text and clearly labeled options (A., B., C., D.).');
      }

      return {
        title: quizTitle || "Dummy-2 (Dallas ISD)",
        description: quizDescription || "Imported geometry assessment from Dallas ISD",
        duration: 90,
        questions: questions.sort((a, b) => a.order_index - b.order_index)
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async uploadQuizImage(
    quizId: string, 
    questionIndex: number, 
    imageBlob: Blob, 
    filename: string
  ): Promise<string> {
    const fileName = `quiz-${quizId}/question-${questionIndex}.png`;
    
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
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

  static async createQuizFromParsedData(
    parsedQuiz: ParsedQuiz,
    isPublished: boolean = true,
    password?: string
  ): Promise<string> {
    try {
      // Create quiz in database
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: parsedQuiz.title,
          description: parsedQuiz.description,
          duration: parsedQuiz.duration,
          status: isPublished ? 'published' : 'draft',
          password_protected: !!password,
          access_password: password,
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

      return quiz.id;
    } catch (error) {
      console.error('Quiz creation error:', error);
      throw error;
    }
  }
}