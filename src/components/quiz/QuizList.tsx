import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Clock, Users, MoreHorizontal, Eye, Edit, Trash, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: number;
  duration: number;
  attempts: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  subjects: string[];
}

const QuizList = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Sample quiz data
  const quizzes: Quiz[] = [
    {
      id: "1",
      title: "Geometry Assessment",
      description: "Comprehensive geometry test covering coordinate systems, graphs, and spatial reasoning",
      questions: 25,
      duration: 60,
      attempts: 128,
      status: "published",
      createdAt: "2024-01-15",
      subjects: ["Mathematics", "Geometry"]
    },
    {
      id: "2", 
      title: "Algebra Fundamentals",
      description: "Basic algebra concepts including linear equations and quadratic functions",
      questions: 30,
      duration: 45,
      attempts: 89,
      status: "published",
      createdAt: "2024-01-10",
      subjects: ["Mathematics", "Algebra"]
    },
    {
      id: "3",
      title: "Calculus Mid-term",
      description: "Limits, derivatives, and integration problems",
      questions: 20,
      duration: 90,
      attempts: 0,
      status: "draft",
      createdAt: "2024-01-20",
      subjects: ["Mathematics", "Calculus"]
    }
  ];

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-accent text-accent-foreground";
      case "draft":
        return "bg-warning text-warning-foreground";
      case "archived":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Quiz Library</h2>
          <p className="text-muted-foreground">Manage and organize your quiz collection</p>
        </div>
        <Link to="/admin/create">
          <Button variant="academic" className="shadow-elegant">
            <Plus className="h-4 w-4 mr-2" />
            New Quiz
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuizzes.map((quiz) => (
          <Card key={quiz.id} className="shadow-card hover:shadow-hover transition-smooth group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg group-hover:text-primary transition-smooth">
                    {quiz.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {quiz.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {quiz.questions} questions
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {quiz.duration}m
                  </span>
                </div>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {quiz.attempts}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {quiz.subjects.slice(0, 2).map((subject) => (
                    <Badge key={subject} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
                <Badge className={getStatusColor(quiz.status)}>
                  {quiz.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Created {quiz.createdAt}
                </span>
                <Link to={`/quiz/${quiz.id}`}>
                  <Button variant="outline" size="sm">
                    View Quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuizzes.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No quizzes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first quiz"}
            </p>
            <Link to="/admin/create">
              <Button variant="academic">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuizList;