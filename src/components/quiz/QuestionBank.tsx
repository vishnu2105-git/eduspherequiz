import { useState } from "react";
import { Plus, Search, Filter, Upload, Image, Type, CheckSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Question {
  id: string;
  text: string;
  type: "multiple-choice" | "fill-blank" | "short-answer";
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  hasImage: boolean;
  tags: string[];
  createdAt: string;
}

const QuestionBank = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Sample questions data
  const questions: Question[] = [
    {
      id: "1",
      text: "What is the slope of the line passing through points (2, 3) and (4, 7)?",
      type: "multiple-choice",
      subject: "Geometry",
      difficulty: "medium",
      hasImage: true,
      tags: ["coordinate-geometry", "slope"],
      createdAt: "2024-01-15"
    },
    {
      id: "2",
      text: "Complete the equation: The area of a circle is π × _____²",
      type: "fill-blank",
      subject: "Geometry", 
      difficulty: "easy",
      hasImage: false,
      tags: ["area", "circle"],
      createdAt: "2024-01-14"
    },
    {
      id: "3",
      text: "Explain the Pythagorean theorem and provide an example.",
      type: "short-answer",
      subject: "Geometry",
      difficulty: "hard",
      hasImage: false,
      tags: ["pythagorean", "theorem"],
      createdAt: "2024-01-13"
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "multiple-choice":
        return CheckSquare;
      case "fill-blank":
        return Type;
      case "short-answer":
        return FileText;
      default:
        return FileText;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-accent text-accent-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "hard":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || question.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Question Bank</h2>
          <p className="text-muted-foreground">Manage your question library and import new questions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="academic" className="shadow-elegant">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedType} onValueChange={setSelectedType}>
              <TabsList>
                <TabsTrigger value="all">All Types</TabsTrigger>
                <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
                <TabsTrigger value="fill-blank">Fill-in-Blank</TabsTrigger>
                <TabsTrigger value="short-answer">Short Answer</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => {
          const TypeIcon = getTypeIcon(question.type);
          return (
            <Card key={question.id} className="shadow-card hover:shadow-hover transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-foreground font-medium leading-relaxed">
                        {question.text}
                      </p>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        {question.hasImage && (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            Image
                          </Badge>
                        )}
                        <Badge className={getDifficultyColor(question.difficulty)}>
                          {question.difficulty}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">{question.subject}</Badge>
                        <div className="flex items-center space-x-1">
                          {question.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {question.createdAt}
                        </span>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No questions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Start building your question bank"}
            </p>
            <Button variant="academic">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Question
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuestionBank;