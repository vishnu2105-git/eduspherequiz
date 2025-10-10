import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Eye, Plus, Image, Trash2, Shield, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuizzes, useQuizQuestions } from "@/hooks/useQuizzes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadService } from "@/services/imageUpload";
import { toast } from "sonner";

interface LocalQuestion {
  id: string;
  type: "multiple-choice" | "fill-blank" | "short-answer";
  text: string;
  options: string[];
  correctAnswer: number | string;
  hasImage: boolean;
  imageUrl?: string;
  points: number;
}

const EditQuiz = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateQuiz } = useQuizzes();
  const { questions, fetchQuestions, createQuestion, updateQuestion, deleteQuestion } = useQuizQuestions(quizId || '');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Quiz settings
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(false);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  
  // SEB settings
  const [requireSeb, setRequireSeb] = useState(false);
  const [sebConfigKey, setSebConfigKey] = useState("");
  const [sebBrowserExamKey, setSebBrowserExamKey] = useState("");
  const [sebQuitUrl, setSebQuitUrl] = useState("");

  // Local questions state for editing
  const [localQuestions, setLocalQuestions] = useState<LocalQuestion[]>([]);

  useEffect(() => {
    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

  useEffect(() => {
    if (questions.length > 0) {
      // Convert database questions to local format
      const convertedQuestions = questions.map(q => {
        let correctAnswer: number | string = 0;
        if (q.question_type === 'multiple-choice' && Array.isArray(q.options)) {
          correctAnswer = q.options.indexOf(q.correct_answer) >= 0 
            ? q.options.indexOf(q.correct_answer) 
            : 0;
        } else {
          correctAnswer = q.correct_answer || '';
        }

        return {
          id: q.id,
          type: q.question_type as "multiple-choice" | "fill-blank" | "short-answer",
          text: q.question_text,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer,
          hasImage: q.has_image || false,
          imageUrl: q.image_url || undefined,
          points: q.points
        };
      });
      setLocalQuestions(convertedQuestions);
    }
  }, [questions]);

  const fetchQuizData = async () => {
    if (!quizId) return;
    
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;

      if (quiz) {
        setQuizTitle(quiz.title);
        setQuizDescription(quiz.description || "");
        setDuration(quiz.duration.toString());
        setAllowMultipleAttempts(quiz.allow_multiple_attempts);
        setShuffleQuestions(quiz.shuffle_questions);
        setShowResultsImmediately(quiz.show_results_immediately);
        setPasswordProtected(quiz.password_protected);
        setAccessPassword(quiz.access_password || "");
        setMaxAttempts(quiz.max_attempts?.toString() || "");
        setRequireSeb(quiz.require_seb);
        setSebConfigKey("93b5ee33edfe55df832cc088ac9c8b8e0a8c5137c0135e358315ad9fb7d0baa4");
        setSebBrowserExamKey("936a0c8c44a491a2d0944b50c20e547898b299a716da29a64a538b534caa6200");
        setSebQuitUrl(quiz.seb_quit_url || "");
      }

      await fetchQuestions();
    } catch (error) {
      console.error("Error fetching quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/admin/quizzes");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: LocalQuestion = {
      id: `temp-${Date.now()}`,
      type: "multiple-choice",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hasImage: false,
      points: 1
    };
    setLocalQuestions([...localQuestions, newQuestion]);
  };

  const updateLocalQuestion = (id: string, field: keyof LocalQuestion, value: any) => {
    setLocalQuestions(localQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setLocalQuestions(localQuestions.filter(q => q.id !== id));
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    if (!quizId) return;
    try {
      const imageUrl = await ImageUploadService.uploadQuestionImage(
        quizId,
        questionId,
        file
      );
      updateLocalQuestion(questionId, 'imageUrl', imageUrl);
      updateLocalQuestion(questionId, 'hasImage', true);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizId) return;
    
    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setSaving(true);

    try {
      // Update quiz data
      await updateQuiz(quizId, {
        title: quizTitle,
        description: quizDescription || undefined,
        duration: parseInt(duration),
        allow_multiple_attempts: allowMultipleAttempts,
        shuffle_questions: shuffleQuestions,
        show_results_immediately: showResultsImmediately,
        password_protected: passwordProtected,
        access_password: passwordProtected ? accessPassword : null,
        max_attempts: maxAttempts ? parseInt(maxAttempts) : null,
        require_seb: requireSeb,
        seb_config_key: requireSeb ? "93b5ee33edfe55df832cc088ac9c8b8e0a8c5137c0135e358315ad9fb7d0baa4" : null,
        seb_browser_exam_key: requireSeb ? "936a0c8c44a491a2d0944b50c20e547898b299a716da29a64a538b534caa6200" : null,
        seb_quit_url: sebQuitUrl || null
      });

      // Save/update questions
      for (const question of localQuestions) {
        if (question.id.startsWith('temp-')) {
          // Create new question
          await createQuestion({
            quiz_id: quizId,
            question_text: question.text,
            question_type: question.type,
            options: question.type === "multiple-choice" ? question.options : undefined,
            correct_answer: question.type === "multiple-choice" 
              ? question.options[question.correctAnswer as number]
              : typeof question.correctAnswer === 'string' ? question.correctAnswer : undefined,
            points: question.points,
            order_index: localQuestions.indexOf(question),
            has_image: question.hasImage,
            image_url: question.imageUrl || undefined
          });
        } else {
          // Update existing question
          await updateQuestion(question.id, {
            question_text: question.text,
            question_type: question.type,
            options: question.type === "multiple-choice" ? question.options : undefined,
            correct_answer: question.type === "multiple-choice" 
              ? question.options[question.correctAnswer as number]
              : typeof question.correctAnswer === 'string' ? question.correctAnswer : undefined,
            points: question.points,
            order_index: localQuestions.indexOf(question),
            has_image: question.hasImage,
            image_url: question.imageUrl || undefined
          });
        }
      }

      // Delete questions that were removed
      const currentQuestionIds = localQuestions.map(q => q.id).filter(id => !id.startsWith('temp-'));
      const originalQuestionIds = questions.map(q => q.id);
      const deletedQuestionIds = originalQuestionIds.filter(id => !currentQuestionIds.includes(id));
      
      for (const questionId of deletedQuestionIds) {
        await deleteQuestion(questionId);
      }

      toast.success("Quiz updated successfully!");
      navigate("/admin/quizzes");
    } catch (error) {
      console.error("Error updating quiz:", error);
      toast.error("Failed to update quiz");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin/quizzes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Edit Quiz</h2>
            <p className="text-muted-foreground">Modify your quiz settings and questions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" disabled>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="academic" 
            className="shadow-elegant"
            onClick={handleSaveQuiz}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Update Quiz"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quiz Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                Quiz Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Enter quiz title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Brief description of the quiz..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="multiple-attempts">Multiple Attempts</Label>
                  <Switch
                    id="multiple-attempts"
                    checked={allowMultipleAttempts}
                    onCheckedChange={setAllowMultipleAttempts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle">Shuffle Questions</Label>
                  <Switch
                    id="shuffle"
                    checked={shuffleQuestions}
                    onCheckedChange={setShuffleQuestions}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="immediate-results">Show Results Immediately</Label>
                  <Switch
                    id="immediate-results"
                    checked={showResultsImmediately}
                    onCheckedChange={setShowResultsImmediately}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="password-protected">Password Protected</Label>
                  <Switch
                    id="password-protected"
                    checked={passwordProtected}
                    onCheckedChange={setPasswordProtected}
                  />
                </div>

                {passwordProtected && (
                  <div className="space-y-2">
                    <Label htmlFor="access-password">Access Password</Label>
                    <Input
                      id="access-password"
                      type="password"
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      placeholder="Enter quiz password..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Max Attempts (optional)</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              {/* SEB Settings */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Safe Exam Browser (SEB)</Label>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-seb">Require SEB</Label>
                  <Switch
                    id="require-seb"
                    checked={requireSeb}
                    onCheckedChange={setRequireSeb}
                  />
                </div>

                {requireSeb && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="seb-config-key">SEB Config Key</Label>
                      <Input
                        id="seb-config-key"
                        value="93b5ee33edfe55df832cc088ac9c8b8e0a8c5137c0135e358315ad9fb7d0baa4"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Automatically configured system key</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seb-browser-key">SEB Browser Exam Key</Label>
                      <Input
                        id="seb-browser-key"
                        value="936a0c8c44a491a2d0944b50c20e547898b299a716da29a64a538b534caa6200"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Automatically configured system key</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seb-quit-url">SEB Quit URL</Label>
                      <Input
                        id="seb-quit-url"
                        value={sebQuitUrl}
                        onChange={(e) => setSebQuitUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Questions ({localQuestions.length})
            </h3>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {localQuestions.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No questions added yet. Click "Add Question" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {localQuestions.map((question, index) => (
                <Card key={question.id} className="shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Question {index + 1}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={question.type}
                          onValueChange={(value) => updateLocalQuestion(question.id, "type", value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            <SelectItem value="fill-blank">Fill-in-Blank</SelectItem>
                            <SelectItem value="short-answer">Short Answer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Textarea
                        value={question.text}
                        onChange={(e) => updateLocalQuestion(question.id, "text", e.target.value)}
                        placeholder="Enter your question here..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          id={`image-upload-${question.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(question.id, file);
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById(`image-upload-${question.id}`)?.click()}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          {question.hasImage ? 'Change Image' : 'Add Image'}
                        </Button>
                      </div>
                      <Badge variant="outline">
                        Points: {question.points}
                      </Badge>
                    </div>

                    {question.hasImage && question.imageUrl && (
                      <div className="relative w-full max-w-xs">
                        <img 
                          src={question.imageUrl} 
                          alt="Question" 
                          className="w-full rounded-md border"
                        />
                      </div>
                    )}

                    {question.type === "multiple-choice" && (
                      <div className="space-y-2">
                        <Label>Answer Options</Label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...question.options];
                                newOptions[optionIndex] = e.target.value;
                                updateLocalQuestion(question.id, "options", newOptions);
                              }}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1"
                            />
                            <Button
                              variant={question.correctAnswer === optionIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateLocalQuestion(question.id, "correctAnswer", optionIndex)}
                            >
                              {question.correctAnswer === optionIndex ? "Correct" : "Mark"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "fill-blank" && (
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Input 
                          value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                          onChange={(e) => updateLocalQuestion(question.id, 'correctAnswer', e.target.value)}
                          placeholder="Enter the correct answer..." 
                        />
                      </div>
                    )}

                    {question.type === "short-answer" && (
                      <div className="space-y-2">
                        <Label>Correct Answer / Answer Guidelines</Label>
                        <Textarea 
                          value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                          onChange={(e) => updateLocalQuestion(question.id, 'correctAnswer', e.target.value)}
                          placeholder="Provide the correct answer or key points for manual grading..."
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuiz;