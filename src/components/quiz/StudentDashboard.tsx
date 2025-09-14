import { Clock, BookOpen, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AvailableQuiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: number;
  dueDate: string;
  status: "available" | "completed" | "overdue";
  score?: number;
  totalPoints?: number;
}

const StudentDashboard = () => {
  const student = {
    name: "Alex Martinez",
    email: "alex.m@school.edu",
    averageScore: 87.5,
    completedQuizzes: 12,
    totalQuizzes: 15
  };

  const availableQuizzes: AvailableQuiz[] = [
    {
      id: "1",
      title: "Geometry Assessment",
      description: "Comprehensive geometry test covering coordinate systems and spatial reasoning",
      duration: 60,
      questions: 25,
      dueDate: "2024-01-25T23:59:00",
      status: "available"
    },
    {
      id: "2",
      title: "Algebra Fundamentals",
      description: "Basic algebra concepts and linear equations",
      duration: 45,
      questions: 30,
      dueDate: "2024-01-22T23:59:00",
      status: "completed",
      score: 27,
      totalPoints: 30
    },
    {
      id: "3",
      title: "Calculus Mid-term",
      description: "Limits, derivatives, and integration problems",
      duration: 90,
      questions: 20,
      dueDate: "2024-01-15T23:59:00",
      status: "overdue"
    }
  ];

  const getStatusBadge = (quiz: AvailableQuiz) => {
    switch (quiz.status) {
      case "available":
        return <Badge className="bg-accent text-accent-foreground">Available</Badge>;
      case "completed":
        return <Badge className="bg-primary text-primary-foreground">Completed</Badge>;
      case "overdue":
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{quiz.status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDueDate = (dueDate: string) => {
    return new Date(dueDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Student Portal</h1>
                  <p className="text-sm text-muted-foreground">Welcome back, {student.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="px-3 py-1">
                {student.email}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">{student.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {student.completedQuizzes}/{student.totalQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(student.completedQuizzes / student.totalQuizzes) * 100} 
                      className="w-16 h-2"
                    />
                    <span className="text-sm font-medium">
                      {Math.round((student.completedQuizzes / student.totalQuizzes) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Quizzes */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Available Quizzes</h2>
            <p className="text-muted-foreground">Complete your assigned quizzes before the due date</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {availableQuizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-card hover:shadow-hover transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{quiz.title}</h3>
                        {getStatusBadge(quiz)}
                      </div>
                      <p className="text-muted-foreground mb-4">{quiz.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {quiz.duration} minutes
                        </span>
                        <span className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {quiz.questions} questions
                        </span>
                      </div>

                      {quiz.status === "completed" && quiz.score && quiz.totalPoints && (
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Award className="h-4 w-4 text-accent" />
                            <span className="font-medium text-accent">
                              Score: {quiz.score}/{quiz.totalPoints} ({((quiz.score / quiz.totalPoints) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDueDate(quiz.dueDate)}
                          </p>
                          {quiz.status === "available" && (
                            <p className={`text-sm font-medium ${
                              getDaysUntilDue(quiz.dueDate) <= 1 ? "text-destructive" : "text-warning"
                            }`}>
                              {getDaysUntilDue(quiz.dueDate) > 0 
                                ? `${getDaysUntilDue(quiz.dueDate)} days remaining`
                                : "Due today!"
                              }
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {quiz.status === "available" && (
                            <Button variant="academic" className="shadow-elegant">
                              Start Quiz
                            </Button>
                          )}
                          {quiz.status === "completed" && (
                            <Button variant="outline">
                              Review Results
                            </Button>
                          )}
                          {quiz.status === "overdue" && (
                            <Button variant="outline" disabled>
                              Overdue
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;