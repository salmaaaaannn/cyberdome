'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, DemoBanner, GlowButton, StatusIndicator } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { academyService } from '@/services';
import { AcademyCourse } from '@/types';

export default function AcademyPage() {
  const { user } = useAppStore();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [activeCategory, setActiveCategory] = useState<'PERSONAL' | 'EMPLOYEE' | 'ENTERPRISE'>('PERSONAL');
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (user?.role === 'ADMIN') setActiveCategory('ENTERPRISE');
    else if (user?.role === 'EMPLOYEE') setActiveCategory('EMPLOYEE');
    else setActiveCategory('PERSONAL');
  }, [user]);

  useEffect(() => {
    academyService.getCourses(activeCategory).then(setCourses);
  }, [activeCategory]);

  const handleStartLesson = (c: AcademyCourse) => {
    setSelectedCourse(c);
    setQuizScore(null);
    setAnswers({});
  };

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedCourse) return;
    const ansArray = Object.values(answers);
    const result = await academyService.submitQuiz(selectedCourse.id, ansArray);
    setQuizScore(result.score);

    // mark as completed if passed
    if (result.passed) {
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? { ...c, isCompleted: true, completedLessons: c.lessonsCount } : c));
    }
  };

  const completedCount = courses.filter(c => c.isCompleted).length;

  return (
    <div className="page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
              CYBERDOME DEFENSE ACADEMY
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
              Interactive cybersecurity awareness, threat actor simulations, quizzes, and credentialing.
            </p>
          </div>

          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            padding: 4,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-primary)'
          }}>
            <button
              onClick={() => setActiveCategory('PERSONAL')}
              className={`btn btn-sm ${activeCategory === 'PERSONAL' ? 'btn-primary' : 'btn-ghost'}`}>
              🛡 Personal Cyber Safety (14)
            </button>
            <button
              onClick={() => setActiveCategory('EMPLOYEE')}
              className={`btn btn-sm ${activeCategory === 'EMPLOYEE' ? 'btn-primary' : 'btn-ghost'}`}>
              🏢 Employee Awareness
            </button>
            <button
              onClick={() => setActiveCategory('ENTERPRISE')}
              className={`btn btn-sm ${activeCategory === 'ENTERPRISE' ? 'btn-primary' : 'btn-ghost'}`}>
              ⚔ Enterprise SOC & TTPs
            </button>
          </div>
        </div>
      </div>

      {/* Progress metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TRACK PROGRESS</div>
          <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginTop: 4 }}>
            {completedCount} / {courses.length} Completed
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="fill" style={{ width: `${(completedCount / Math.max(1, courses.length)) * 100}%`, background: 'var(--color-success)' }} />
          </div>
        </GlassPanel>

        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AWARENESS INDEX</div>
          <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginTop: 4, color: 'var(--color-success)' }}>
            88% High Resilience
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Based on verified quiz completions</p>
        </GlassPanel>

        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SECURITY BADGES</div>
          <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginTop: 4, color: 'var(--color-info)' }}>
            2 Earned
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Phish Guard & Cyber Shield</p>
        </GlassPanel>
      </div>

      {/* Course Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {courses.map(course => (
          <GlassPanel key={course.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{course.level}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{course.duration}</span>
              </div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{course.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                {course.description}
              </p>
            </div>

            <div>
              <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>{course.isCompleted ? '100% Completed' : `${course.completedLessons} of ${course.lessonsCount} lessons`}</span>
                {course.badge && <span className="badge badge-safe" style={{ fontSize: '0.65rem' }}>🏅 {course.badge}</span>}
              </div>

              <div className="progress-bar" style={{ marginBottom: 14 }}>
                <div
                  className="fill"
                  style={{
                    width: `${(course.completedLessons / course.lessonsCount) * 100}%`,
                    background: course.isCompleted ? 'var(--color-success)' : 'var(--color-info)'
                  }}
                />
              </div>

              <GlowButton
                variant={course.isCompleted ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => handleStartLesson(course)}
                style={{ width: '100%' }}>
                {course.isCompleted ? 'Review Course & Quiz' : course.completedLessons > 0 ? 'Resume Lesson' : 'Start Course'}
              </GlowButton>
            </div>
          </GlassPanel>
        ))}
      </div>

      {/* Interactive Lesson & Quiz Modal */}
      {selectedCourse && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 28,
            maxWidth: 640,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>MODULE INTERACTIVE LAB</span>
                <h3 style={{ fontFamily: 'var(--font-heading)', marginTop: 4 }}>{selectedCourse.title}</h3>
              </div>
              <button onClick={() => setSelectedCourse(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {quizScore === null ? (
              <div>
                <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 4, marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  <strong>Key Learning Objective:</strong> In this interactive drill, you will analyze simulated deceptive scenarios. Always examine email headers, verify URL domain endings, and never approve authentication requests without an explicit, out-of-band verification.
                </div>

                <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Assessment Question:</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 16 }}>
                  You receive an urgent phone call claiming to be your bank&apos;s fraud monitoring desk. The caller says a transaction of $1,400 was attempted on your card in another country, and you must read back the 6-digit SMS code you just received to cancel it. What is the correct response?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    'Immediately read the 6-digit code so the transaction is cancelled.',
                    'Disconnect immediately. Legitimate banks never ask for SMS OTP codes over the phone.',
                    'Ask the caller for their badge number, then provide the OTP.',
                    'Forward the SMS to another phone number provided by the caller.'
                  ].map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(0, idx)}
                      style={{
                        padding: '12px 16px',
                        background: answers[0] === idx ? 'var(--color-info-bg)' : 'var(--bg-surface)',
                        border: answers[0] === idx ? '1px solid var(--color-info)' : '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        textAlign: 'left',
                        color: answers[0] === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: answers[0] === idx ? 600 : 400,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}>
                      {answers[0] === idx ? '✓ ' : '○ '} {opt}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button onClick={() => setSelectedCourse(null)} className="btn btn-ghost btn-sm">Cancel</button>
                  <GlowButton variant="primary" size="md" onClick={handleSubmitQuiz} disabled={answers[0] === undefined}>
                    Submit Answer & Grade
                  </GlowButton>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: '3rem' }}>{quizScore >= 75 ? '🎉' : '⚠️'}</span>
                <h3 style={{ color: quizScore >= 75 ? 'var(--color-success)' : 'var(--cyberdome-red)', marginTop: 12 }}>
                  {quizScore >= 75 ? 'Module Passed Successfully!' : 'Review Recommended'}
                </h3>
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', marginTop: 6 }}>
                  Score: {quizScore}%
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '12px auto', maxWidth: 460 }}>
                  {quizScore >= 75
                    ? 'Excellent job! You correctly identified that banks never request SMS OTP verification codes over the phone.'
                    : 'Remember: Never disclose one-time passwords, UPI PINs, or verification codes to any caller.'}
                </p>

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button onClick={() => setSelectedCourse(null)} className="btn btn-primary">
                    Return to Academy Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
