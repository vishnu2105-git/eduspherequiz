import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quizId, studentName, studentEmail, userId } = await req.json();

    if (!quizId) {
      return new Response(
        JSON.stringify({ error: 'Quiz ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify quiz exists and is published
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('status', 'published')
      .single();

    if (quizError || !quiz) {
      console.error('Quiz fetch error:', quizError);
      return new Response(
        JSON.stringify({ error: 'Quiz not found or not published' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user already has an active attempt
    let existingAttempt = null;
    if (userId) {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .maybeSingle();
      
      existingAttempt = attempts;
    }

    // Check attempt limits
    if (!quiz.allow_multiple_attempts && userId) {
      const { data: completedAttempts, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .eq('status', 'submitted');

      if (attemptError) {
        console.error('Attempt check error:', attemptError);
      }

      if (completedAttempts && completedAttempts.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Multiple attempts not allowed',
            message: 'You have already completed this quiz'
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Check max attempts limit
    if (quiz.max_attempts && userId) {
      const { data: allAttempts, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', userId);

      if (attemptError) {
        console.error('Max attempts check error:', attemptError);
      }

      if (allAttempts && allAttempts.length >= quiz.max_attempts) {
        return new Response(
          JSON.stringify({ 
            error: 'Maximum attempts exceeded',
            message: `You have reached the maximum of ${quiz.max_attempts} attempts for this quiz`
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    let attempt;

    if (existingAttempt) {
      attempt = existingAttempt;
    } else {
      // Generate secure access token
      const { data: tokenResult, error: tokenError } = await supabase
        .rpc('generate_access_token');

      if (tokenError) {
        console.error('Token generation error:', tokenError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate access token' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create new quiz attempt
      const { data: newAttempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert([
          {
            quiz_id: quizId,
            user_id: userId || null,
            student_name: studentName || null,
            student_email: studentEmail || null,
            access_token: tokenResult,
            is_seb_session: quiz.require_seb,
            status: 'in_progress'
          }
        ])
        .select()
        .single();

      if (attemptError) {
        console.error('Attempt creation error:', attemptError);
        return new Response(
          JSON.stringify({ error: 'Failed to create quiz attempt' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      attempt = newAttempt;
    }

    // Generate secure launch URL
    const baseUrl = new URL(req.url).origin;
    const launchUrl = `${baseUrl}/quiz/${quizId}?token=${attempt.access_token}`;

    console.log('Quiz launch created:', {
      quizId,
      attemptId: attempt.id,
      userId,
      studentName,
      requireSeb: quiz.require_seb
    });

    return new Response(
      JSON.stringify({
        success: true,
        attemptId: attempt.id,
        launchUrl,
        accessToken: attempt.access_token,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          duration: quiz.duration,
          requireSeb: quiz.require_seb,
          sebConfigKey: quiz.seb_config_key,
          sebQuitUrl: quiz.seb_quit_url
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Quiz launch error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to create quiz launch session'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});