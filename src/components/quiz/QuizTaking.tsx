import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, AlertCircle, ChevronLeft, ChevronRight, Flag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: string;
  type: "multiple-choice" | "fill-blank" | "short-answer";
  text: string;
  options?: string[];
  hasImage?: boolean;
  imageUrl?: string;
  points: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
}

const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample quiz data
  const quizData: QuizData = {
    id: "1",
    title: "Geometry Assessment",
    description: "Comprehensive geometry test covering coordinate systems and spatial reasoning",
    duration: 60,
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        text: "What is the slope of the line passing through points (2, 3) and (4, 7)?",
        options: ["2", "1/2", "-2", "4"],
        hasImage: true,
        imageUrl: "/placeholder.svg",
        points: 2
      },
      {
        id: "q2", 
        type: "fill-blank",
        text: "The area of a circle with radius r is π × _____²",
        points: 1
      },
      {
        id: "q3",
        type: "short-answer",
        text: "Explain the Pythagorean theorem and provide an example of its application.",
        points: 3
      },
      {
        id: "q4",
        type: "multiple-choice",
        text: "Which of the following is NOT a property of parallel lines?",
        options: [
          "They never intersect",
          "They have the same slope",
          "They form right angles",
          "They maintain equal distance"
        ],
        points: 1
      }
    ]
  };

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    navigate("/student");
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-destructive"; // Last 5 minutes
    if (timeRemaining <= 600) return "text-warning"; // Last 10 minutes
    return "text-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Timer */}
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{quizData.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className={`h-4 w-4 ${getTimerColor()}`} />
                <span className={`font-mono text-lg font-semibold ${getTimerColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <Button 
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="bg-gradient-accent text-accent-foreground shadow-elegant"
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Question Navigation */}
          <aside className="lg:col-span-1">
            <Card className="shadow-card sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {quizData.questions.map((question, index) => {
                    const isAnswered = answers[question.id];
                    const isFlagged = flaggedQuestions.has(question.id);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`relative w-10 h-10 rounded-lg text-sm font-medium transition-smooth ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-elegant"
                            : isAnswered
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-muted"
                        }`}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-warning fill-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Answered:</span>
                    <Badge variant="outline">{Object.keys(answers).length}/{quizData.questions.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Flagged:</span>
                    <Badge variant="outline">{flaggedQuestions.size}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Question Area */}
          <main className="lg:col-span-3">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary">
                        {currentQuestion.type.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      {currentQuestion.text}
                    </CardTitle>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQuestion.id)}
                    className={flaggedQuestions.has(currentQuestion.id) ? "bg-warning/10 border-warning text-warning" : ""}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Image Display */}
                {currentQuestion.hasImage && currentQuestion.imageUrl && (
                  <div className="rounded-lg border border-border p-4 bg-muted/30">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question diagram"
                      className="w-full max-w-md mx-auto rounded cursor-pointer hover:scale-105 transition-smooth"
                      onClick={() => {
                        // Open in modal for zoom functionality
                      }}
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Click image to zoom
                    </p>
                  </div>
                )}

                {/* Answer Input */}
                <div className="space-y-4">
                  {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ""}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                          <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                          <Label
                            htmlFor={`${currentQuestion.id}-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.type === "fill-blank" && (
                    <div className="space-y-2">
                      <Label htmlFor="fill-answer">Your Answer:</Label>
                      <Input
                        id="fill-answer"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Enter your answer..."
                        className="text-lg"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "short-answer" && (
                    <div className="space-y-2">
                      <Label htmlFor="short-answer">Your Answer:</Label>
                      <Textarea
                        id="short-answer"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Enter your detailed answer..."
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {answers[currentQuestion.id] && (
                      <Badge className="bg-accent text-accent-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        Answered
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentQuestionIndex === quizData.questions.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Time Warning */}
            {timeRemaining <= 600 && (
              <Alert className="mt-4 border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  {timeRemaining <= 300
                    ? "⚠️ Only 5 minutes remaining! Please submit your quiz soon."
                    : "⏰ 10 minutes remaining. Please review your answers."
                  }
                </AlertDescription>
              </Alert>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default QuizTaking;