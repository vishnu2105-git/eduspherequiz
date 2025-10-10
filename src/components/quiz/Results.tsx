import { useState, useEffect } from "react";
import { Download, Filter, Search, Calendar, TrendingUp, Users, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { exportResultsToCSV } from "@/utils/csvExport";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface QuizResult {
  id: string;
  studentName: string;
  studentEmail: string;
  quizTitle: string;
  score: number;
  totalPoints: number;
  timeSpent: number;
  completedAt: string;
  status: "completed" | "in-progress" | "not-started";
}

const Results = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterQuiz, setFilterQuiz] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizzes, setQuizzes] = useState<Array<{id: string, title: string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);

      // Get current user to filter results for their quizzes only
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view results");
        return;
      }

      // Fetch quiz attempts with related quiz data
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          status,
          score,
          max_score,
          time_spent,
          submitted_at,
          student_name,
          student_email,
          user_id,
          quizzes!inner (
            id,
            title,
            created_by
          )
        `)
        .eq('quizzes.created_by', user.id)
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get profile names for attempts with user_id
      const userIds = attempts?.filter(a => a.user_id).map(a => a.user_id) || [];
      let profiles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        
        profiles = profileData?.reduce((acc, profile) => {
          acc[profile.user_id] = profile.display_name || '';
          return acc;
        }, {} as Record<string, string>) || {};
      }

      // Transform data to match component interface
      const transformedResults: QuizResult[] = attempts?.map(attempt => ({
        id: attempt.id,
        studentName: attempt.student_name || (attempt.user_id ? profiles[attempt.user_id] : null) || 'Anonymous',
        studentEmail: attempt.student_email || 'N/A',
        quizTitle: attempt.quizzes.title,
        score: attempt.score || 0,
        totalPoints: attempt.max_score || 0,
        timeSpent: Math.floor((attempt.time_spent || 0) / 60), // Convert seconds to minutes
        completedAt: attempt.submitted_at || new Date().toISOString(),
        status: attempt.status === 'submitted' ? 'completed' : attempt.status as any
      })) || [];

      setResults(transformedResults);

      // Get unique quiz titles for filter dropdown
      const uniqueQuizzes = Array.from(
        new Set(transformedResults.map(r => r.quizTitle))
      ).map(title => ({ 
        id: title, 
        title 
      }));
      setQuizzes(uniqueQuizzes);

    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQuiz = filterQuiz === "all" || result.quizTitle === filterQuiz;
    const matchesStatus = filterStatus === "all" || result.status === filterStatus;
    
    return matchesSearch && matchesQuiz && matchesStatus;
  });

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "text-accent";
    if (percentage >= 70) return "text-warning";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case "not-started":
        return <Badge variant="secondary">Not Started</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Stats calculations
  const completedResults = results.filter(r => r.status === "completed");
  const averageScore = completedResults.length > 0 
    ? completedResults.reduce((sum, r) => sum + ((r.score / r.totalPoints) * 100), 0) / completedResults.length 
    : 0;
  const totalAttempts = results.length;
  const averageTime = completedResults.length > 0
    ? completedResults.reduce((sum, r) => sum + r.timeSpent, 0) / completedResults.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Quiz Results</h2>
          <p className="text-muted-foreground">Monitor student performance and export reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button 
            variant="academic" 
            className="shadow-elegant"
            onClick={() => {
              exportResultsToCSV(filteredResults);
              toast.success('Results exported to CSV');
            }}
            disabled={filteredResults.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Award className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold text-foreground">{averageScore.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold text-foreground">{totalAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Time</p>
                <p className="text-2xl font-bold text-foreground">{averageTime.toFixed(0)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {((completedResults.length / totalAttempts) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students or quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterQuiz} onValueChange={setFilterQuiz}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Quizzes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quizzes</SelectItem>
                {quizzes.map(quiz => (
                  <SelectItem key={quiz.id} value={quiz.title}>
                    {quiz.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-muted-foreground">Loading results...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {results.length === 0 ? "No quiz attempts found" : "No results match your filters"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.studentName}</div>
                        <div className="text-sm text-muted-foreground">{result.studentEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{result.quizTitle}</TableCell>
                    <TableCell>
                      {result.totalPoints > 0 ? (
                        <>
                          <div className={`font-semibold ${getScoreColor(result.score, result.totalPoints)}`}>
                            {result.score}/{result.totalPoints}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {((result.score / result.totalPoints) * 100).toFixed(1)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not graded</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {result.timeSpent}m
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(result.completedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/results/${result.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;