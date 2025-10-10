export const exportResultsToCSV = (results: any[]) => {
  if (results.length === 0) {
    return;
  }

  // Define CSV headers
  const headers = [
    'Student Name',
    'Student Email',
    'Quiz Title',
    'Score',
    'Total Points',
    'Percentage',
    'Time Spent (minutes)',
    'Status',
    'Completed At'
  ];

  // Convert results to CSV rows
  const rows = results.map(result => [
    result.studentName,
    result.studentEmail,
    result.quizTitle,
    result.score,
    result.totalPoints,
    `${((result.score / result.totalPoints) * 100).toFixed(1)}%`,
    result.timeSpent,
    result.status,
    new Date(result.completedAt).toLocaleString()
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `quiz_results_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
