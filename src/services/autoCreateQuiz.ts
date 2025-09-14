import { supabase } from "@/integrations/supabase/client";
import { RealPDFParser } from "./realPdfParser";
import { toast } from "sonner";

export class AutoCreateQuizService {
  static async createDummy2Quiz(): Promise<string | null> {
    try {
      // Check if quiz already exists
      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('title', 'Dummy-2 (Dallas ISD)')
        .single();

      if (existingQuiz) {
        console.log('Dummy-2 quiz already exists:', existingQuiz.id);
        return existingQuiz.id;
      }

      toast.loading("Creating Dummy-2 quiz from PDF...");

      // Parse the PDF from public folder
      const parsedQuiz = await RealPDFParser.parseQuizFromPDF(
        '/Dummy-2.pdf',
        'Dummy-2 (Dallas ISD)',
        'Dallas ISD Geometry Assessment - Imported from PDF'
      );

      // Create the quiz with password protection
      const quizId = await RealPDFParser.createQuizFromParsedData(
        parsedQuiz,
        true, // published
        'Exam2025' // password
      );

      toast.dismiss();
      toast.success(`Created Dummy-2 quiz with ${parsedQuiz.questions.length} questions!`, {
        duration: 5000,
        action: {
          label: 'Open Direct Link',
          onClick: () => {
            const directUrl = `${window.location.origin}/quiz/${quizId}/direct`;
            navigator.clipboard.writeText(directUrl);
            toast.success('Direct link copied to clipboard!');
            window.open(directUrl, '_blank');
          }
        }
      });

      return quizId;
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to create Dummy-2 quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Auto-create quiz error:', error);
      return null;
    }
  }
}