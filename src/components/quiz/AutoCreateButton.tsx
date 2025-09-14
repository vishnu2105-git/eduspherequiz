import { Button } from "@/components/ui/button";
import { AutoCreateQuizService } from "@/services/autoCreateQuiz";
import { FileText } from "lucide-react";
import { useState } from "react";

interface AutoCreateButtonProps {
  onQuizCreated?: (quizId: string) => void;
}

export const AutoCreateButton = ({ onQuizCreated }: AutoCreateButtonProps) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleAutoCreate = async () => {
    setIsCreating(true);
    try {
      const quizId = await AutoCreateQuizService.createDummy2Quiz();
      if (quizId) {
        onQuizCreated?.(quizId);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleAutoCreate}
      disabled={isCreating}
      variant="secondary"
      className="flex items-center gap-2"
    >
      <FileText className="h-4 w-4" />
      {isCreating ? "Creating Dummy-2 Quiz..." : "Auto-Create Dummy-2 Quiz"}
    </Button>
  );
};