import React, { useState, useEffect } from 'react';
import { AuthUser, Screening } from '../types';
import { api } from '../api/client';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelHeart, 
  PixelShield, 
  PixelCheck, 
  PixelClock,
  PixelSparkle,
  PixelArrowRight
} from './PixelUI';
import { AlertCircle, History } from 'lucide-react';

interface ScreeningViewProps {
  user: AuthUser | null;
  onOpenAuth: (tab: 'student-login' | 'counsellor-login') => void;
  onNavigateToBooking: () => void;
}

interface Question {
  id: string;
  category: string;
  prompt: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'Mood & Interest',
    prompt: 'Over the last 2 weeks, how often have you had little interest or pleasure in doing academic or recreational activities?'
  },
  {
    id: 'q2',
    category: 'Mood & Energy',
    prompt: 'Over the last 2 weeks, how often have you felt down, depressed, unmotivated, or hopeless?'
  },
  {
    id: 'q3',
    category: 'Sleep Quality',
    prompt: 'Trouble falling asleep, waking frequently during the night, or sleeping excessively?'
  },
  {
    id: 'q4',
    category: 'Vitality & Exhaustion',
    prompt: 'Feeling persistently tired, drained, or having very low physical/mental energy during classes?'
  },
  {
    id: 'q5',
    category: 'Anxiety & Tension',
    prompt: 'Feeling nervous, anxious, restless, or on edge about coursework, exams, or personal matters?'
  },
  {
    id: 'q6',
    category: 'Worry & Control',
    prompt: 'Experiencing persistent worry that feels difficult or impossible to control or set aside?'
  },
  {
    id: 'q7',
    category: 'Cognitive Focus',
    prompt: 'Trouble concentrating on reading, listening to lectures, completing assignments, or making decisions?'
  },
  {
    id: 'q8',
    category: 'Academic Overwhelm',
    prompt: 'Feeling that academic deadlines, exams, or campus commitments are exceeding your ability to cope?'
  }
];

const OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 }
];

export const ScreeningView: React.FC<ScreeningViewProps> = ({ user, onOpenAuth, onNavigateToBooking }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedScreening, setSubmittedScreening] = useState<Screening | null>(null);
  const [history, setHistory] = useState<Screening[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.screenings.getHistory();
      setHistory(data.screenings || []);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectOption = (questionId: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, val) => sum + val, 0);
  };

  const getSummaryTier = (score: number): { summary: string; recommendation: string; variant: 'mint' | 'lavender' | 'amber' | 'red' } => {
    if (score <= 5) {
      return {
        summary: 'Low Distress - General Wellbeing Maintained',
        recommendation: 'Your responses indicate mild or negligible distress. Continue regular self-care, sleep hygiene, and balanced campus activities.',
        variant: 'mint'
      };
    } else if (score <= 10) {
      return {
        summary: 'Mild Stress & Academic Fatigue - Proactive Coping Recommended',
        recommendation: 'You may be encountering routine campus stress or transient burnout. Consider mindful breaks, peer support groups, or an introductory counselling check-in.',
        variant: 'lavender'
      };
    } else if (score <= 16) {
      return {
        summary: 'Moderate Stress & Anxiety - Campus Counselling Recommended',
        recommendation: 'Your score suggests notable academic anxiety or persistent fatigue. We strongly encourage scheduling a session with a campus counsellor to explore coping strategies.',
        variant: 'amber'
      };
    } else {
      return {
        summary: 'Elevated Distress - Priority Counselling Support Advised',
        recommendation: 'Your responses reflect high levels of distress. Speaking with a university counsellor or health professional can provide structured guidance and immediate support.',
        variant: 'red'
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Object.keys(answers).length < QUESTIONS.length) {
      setError(`Please respond to all ${QUESTIONS.length} items to receive an accurate wellness summary.`);
      return;
    }

    if (!user) {
      setError('Please sign in or register as a student to securely save your confidential screening results.');
      onOpenAuth('student-login');
      return;
    }

    if (user.role !== 'STUDENT') {
      setError('Only student accounts are eligible to submit wellness self-screenings.');
      return;
    }

    setIsSubmitting(true);
    const score = calculateScore();
    const { summary } = getSummaryTier(score);

    // Structure responses JSON
    const structuredResponses = {
      version: '1.0',
      assessment_type: 'CampusCare Wellness Self-Screening (PHQ/GAD Adapt)',
      submitted_at: new Date().toISOString(),
      items: QUESTIONS.map(q => ({
        id: q.id,
        category: q.category,
        prompt: q.prompt,
        response_value: answers[q.id] ?? 0,
        response_label: OPTIONS.find(o => o.value === (answers[q.id] ?? 0))?.label || ''
      }))
    };

    try {
      const res = await api.screenings.submit({
        responses: structuredResponses,
        overall_score: score,
        screening_summary: summary
      });

      setSubmittedScreening(res.screening);
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to submit screening. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PixelBadge variant="lavender" size="sm" icon={<PixelHeart size={10} className="text-[#7E65B7]" />}>
            EVALUATION
          </PixelBadge>
          <PixelBadge variant="mint" size="sm">
            CONFIDENTIAL
          </PixelBadge>
          <PixelBadge variant="cream" size="sm">
            8 ITEMS
          </PixelBadge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#231E2C]">
          Campus Wellness & Stress Self-Screening
        </h1>
        <p className="text-xs sm:text-sm text-[#534B62] leading-relaxed">
          This self-evaluation adapts validated mental health screening benchmarks to help you reflect on stress, anxiety, and academic fatigue over the preceding two weeks.
        </p>

        {/* Informational Disclaimer Card */}
        <PixelCard variant="cream" shadow="sm" border="dark" className="p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-[#DDD4F0] border border-[#2B2438] flex items-center justify-center text-[#2C1F48] shrink-0 mt-0.5">
            <PixelShield size={16} />
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-[#231E2C] block">Informational Disclaimer</span>
            <p className="text-[#534B62] leading-relaxed">
              This questionnaire is an educational self-reflection resource and does not constitute a medical, psychiatric, or clinical diagnosis. If you are experiencing acute distress or a crisis, please contact campus emergency services or the national crisis helpline immediately.
            </p>
          </div>
        </PixelCard>
      </div>

      {/* Submitted Result Card */}
      {submittedScreening && (
        <PixelCard
          variant="white"
          shadow="lg"
          border="dark"
          accentBorderTop="mint"
          className="mb-10 p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between border-b-2 border-[#2B2438] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#E0F4EA] border border-[#2B2438] flex items-center justify-center text-[#297D56]">
                <PixelCheck size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#231E2C]">
                  Screening Evaluation Complete
                </h3>
                <span className="text-[11px] text-[#7E7491] font-mono">
                  Recorded on {new Date(submittedScreening.submitted_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <PixelBadge variant="mint" size="sm" pixelFont>
              SAVED
            </PixelBadge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#FAF8F5] border-2 border-[#2B2438] shadow-[2px_2px_0px_#DDD4F0] text-center sm:text-left">
              <span className="text-[11px] font-mono uppercase text-[#7E7491] block">Distress Score</span>
              <p className="text-3xl font-extrabold font-pixel text-[#231E2C] mt-1">
                {submittedScreening.overall_score !== null ? Number(submittedScreening.overall_score).toFixed(1) : '--'}
                <span className="text-xs font-sans font-normal text-[#7E7491]"> / 24</span>
              </p>
            </div>

            <div className="sm:col-span-2 p-4 bg-[#FAF8F5] border-2 border-[#2B2438] shadow-[2px_2px_0px_#DDD4F0] space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#7E7491] block">Evaluation Tier</span>
              <p className="text-sm font-bold text-[#231E2C]">
                {submittedScreening.screening_summary}
              </p>
              <p className="text-xs text-[#534B62] leading-relaxed">
                {getSummaryTier(Number(submittedScreening.overall_score || 0)).recommendation}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#E8E0D5]">
            <PixelButton
              variant="outline"
              size="md"
              onClick={() => {
                setSubmittedScreening(null);
                setAnswers({});
              }}
            >
              Retake or Start New Screening
            </PixelButton>

            <PixelButton
              variant="mintDark"
              size="md"
              onClick={onNavigateToBooking}
              icon={<PixelArrowRight size={14} />}
              iconPosition="right"
            >
              Schedule Counselling Follow-up
            </PixelButton>
          </div>
        </PixelCard>
      )}

      {/* Main Questionnaire Form */}
      {!submittedScreening && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Progress Bar Header */}
          <PixelCard variant="cream" shadow="sm" border="dark" className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#534B62] mb-2">
              <span>Questionnaire Progress: {answeredCount} of {QUESTIONS.length} items</span>
              <span className="font-mono text-[#231E2C] font-bold">{progressPercent}%</span>
            </div>
            
            {/* Stepped Pixel Progress Indicator */}
            <div className="w-full h-3 bg-white border-2 border-[#2B2438] flex p-0.5 gap-0.5">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 transition-all ${
                    i < answeredCount ? 'bg-[#5ABF8F]' : 'bg-[#FAF8F5]'
                  }`}
                />
              ))}
            </div>
          </PixelCard>

          {/* Question Cards */}
          <div className="space-y-4">
            {QUESTIONS.map((q, idx) => (
              <PixelCard
                key={q.id}
                variant="white"
                shadow="sm"
                border="dark"
                className="p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-[#EFEAF8] border-2 border-[#2B2438] text-[#2C1F48] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    0{idx + 1}
                  </span>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#7E65B7] font-bold block">
                      {q.category}
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-[#231E2C] mt-0.5 leading-snug">
                      {q.prompt}
                    </h2>
                  </div>
                </div>

                {/* Option Choice Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {OPTIONS.map(opt => {
                    const isSelected = answers[q.id] === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => handleSelectOption(q.id, opt.value)}
                        className={`
                          p-3 text-left border-2 transition-all flex flex-col justify-between rounded-none min-h-[64px]
                          ${isSelected
                            ? 'border-[#2B2438] bg-[#BFECD3] text-[#0F3523] shadow-[2px_2px_0px_#2B2438] font-bold translate-x-[1px] translate-y-[1px]'
                            : 'border-[#D6CCE8] bg-[#FAF8F5] text-[#534B62] hover:border-[#2B2438] hover:bg-white'
                          }
                        `}
                      >
                        <span className="text-[10px] font-mono block text-[#7E7491]">
                          {opt.value} {opt.value === 1 ? 'pt' : 'pts'}
                        </span>
                        <span className="text-xs mt-1 leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PixelCard>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission Bar */}
          <PixelCard variant="cream" shadow="md" border="dark" className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[#534B62]">
              Running Score Total: <span className="font-pixel font-bold text-sm text-[#231E2C]">{calculateScore()}</span> / 24
            </div>

            <PixelButton
              type="submit"
              variant="mintDark"
              size="lg"
              disabled={isSubmitting || !isComplete}
              icon={<PixelArrowRight size={14} />}
              iconPosition="right"
            >
              {isSubmitting ? 'Recording Screening...' : 'Submit Confidential Screening'}
            </PixelButton>
          </PixelCard>
        </form>
      )}

      {/* Student Past Screening History Section */}
      {user && user.role === 'STUDENT' && history.length > 0 && (
        <div className="mt-14 pt-8 border-t-2 border-[#2B2438] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-[#231E2C]">
              <History className="w-5 h-5 text-[#7E65B7]" />
              <span>Your Previous Wellness Screenings</span>
            </div>
            <PixelBadge variant="lavender" size="sm">
              {history.length} SUBMISSIONS
            </PixelBadge>
          </div>

          <div className="space-y-3">
            {history.map(s => (
              <PixelCard
                key={s.screening_id}
                variant="white"
                shadow="sm"
                border="dark"
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#7E7491] mb-1 font-mono">
                    <PixelClock size={12} className="text-[#534B62]" />
                    <span>{new Date(s.submitted_at).toLocaleString()}</span>
                    <span>·</span>
                    <span>ID #{s.screening_id}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#231E2C]">
                    {s.screening_summary || 'General Assessment'}
                  </h3>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-[#7E7491] uppercase font-mono block">Score</span>
                    <span className="text-sm font-pixel font-bold text-[#231E2C]">
                      {s.overall_score !== null ? Number(s.overall_score).toFixed(1) : '--'}
                    </span>
                  </div>
                  <PixelButton
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToBooking}
                  >
                    Schedule Session
                  </PixelButton>
                </div>
              </PixelCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
