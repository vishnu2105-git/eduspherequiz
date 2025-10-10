import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Award, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionResult {
  question_text: string;
  question_type: string;
  points: number;
  answer_text: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
}

const StudentResultView = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [attemptData, setAttemptData] = useState<any>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      // Fetch attempt details
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (title, show_results_immediately)
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      
      setAttemptData(attempt);

      // Check if results should be shown
      if (!attempt.quizzes.show_results_immediately) {
        toast.error("Results are not available yet");
        navigate('/student');
        return;
      }

      // Fetch question results
      const { data: answers, error: answersError } = await supabase
        .from('attempt_answers')
        .select(`
          *,
          questions (question_text, question_type, points, correct_answer)
        `)
        .eq('attempt_id', attemptId)
        .order('created_at');

      if (answersError) throw answersError;

      const formattedResults: QuestionResult[] = answers?.map(ans => ({
        question_text: ans.questions.question_text,
        question_type: ans.questions.question_type,
        points: ans.questions.points,
        answer_text: ans.answer_text,
        correct_answer: ans.questions.correct_answer,
        is_correct: ans.is_correct,
        points_earned: ans.points_earned
      })) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Failed to load results");
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attemptData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Results Not Found</h2>
            <p className="text-muted-foreground mb-4">Unable to load quiz results.</p>
            <Button variant="outline" onClick={() => navigate("/student")}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scorePercentage = attemptData.max_score > 0 
    ? (attemptData.score / attemptData.max_score) * 100 
    : 0;

  const getScoreColor = () => {
    if (scorePercentage >= 90) return "text-accent";
    if (scorePercentage >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/student')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Score Summary */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{attemptData.quizzes.title} - Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className={`text-4xl font-bold ${getScoreColor()}`}>
                  {attemptData.score}/{attemptData.max_score}
                </p>
                <p className={`text-xl font-semibold ${getScoreColor()}`}>
                  {scorePercentage.toFixed(1)}%
                </p>
              </div>
              
              <div className="text-right space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time: {Math.floor((attemptData.time_spent || 0) / 60)}m</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(attemptData.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Progress value={scorePercentage} className="h-3" />

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{results.filter(r => r.is_correct).length}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{results.filter(r => !r.is_correct).length}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{results.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question by Question Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Question Breakdown</h3>
          
          {results.map((result, index) => (
            <Card key={index} className={`shadow-card border-l-4 ${
              result.is_correct ? 'border-l-accent' : 'border-l-destructive'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary">Question {index + 1}</Badge>
                      <Badge variant="outline">{result.points} points</Badge>
                      {result.is_correct ? (
                        <Badge className="bg-accent text-accent-foreground">
                          <Check className="h-3 w-3 mr-1" />
                          Correct
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive text-destructive-foreground">
                          <X className="h-3 w-3 mr-1" />
                          Incorrect
                        </Badge>
                      )}
                    </div>
                    <p className="text-base font-medium text-foreground">{result.question_text}</p>
                  </div>
                  <div className={`font-bold text-lg ${result.is_correct ? 'text-accent' : 'text-destructive'}`}>
                    {result.points_earned}/{result.points}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Answer:</p>
                    <p className={`text-base ${result.is_correct ? 'text-accent' : 'text-destructive'}`}>
                      {result.answer_text || 'No answer provided'}
                    </p>
                  </div>
                  
                  {!result.is_correct && result.question_type !== 'short-answer' && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Correct Answer:</p>
                      <p className="text-base text-accent">{result.correct_answer}</p>
                    </div>
                  )}

                  {result.question_type === 'short-answer' && (
                    <Badge variant="outline" className="text-xs">
                      Short answer - requires manual grading
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentResultView;
