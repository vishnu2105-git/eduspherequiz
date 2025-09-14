import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "@/components/quiz/AdminDashboard";
import StudentDashboard from "@/components/quiz/StudentDashboard";
import QuizTaking from "@/components/quiz/QuizTaking";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/quiz/:quizId" element={<QuizTaking />} />
        </Routes>
      </Router>
      <Toaster />
    </div>
  );
};

export default Index;