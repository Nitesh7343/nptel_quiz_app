import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Circle, RotateCcw, Sparkles, X } from 'lucide-react';
import assignments from './questions.json';
import './styles.css';

const STORE_KEY = 'nptel-practice-progress-v1';
const emptyState = () => ({ answers: {}, completed: {} });

function readProgress() {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; }
  catch { return emptyState(); }
}

function App() {
  const [week, setWeek] = useState(1);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(readProgress);
  const [mobileWeeksOpen, setMobileWeeksOpen] = useState(false);
  const assignment = assignments.find((item) => item.week === week) || assignments[0];
  const question = assignment.questions[index];
  const answerState = progress.answers[question.id];
  const selected = answerState?.selected || [];
  const submitted = Boolean(answerState?.submitted);
  const isMulti = question.correct.length > 1;
  const rightCount = assignment.questions.filter((item) => progress.answers[item.id]?.submitted && progress.answers[item.id]?.isCorrect).length;
  const doneCount = assignment.questions.filter((item) => progress.answers[item.id]?.submitted).length;
  const percent = Math.round((doneCount / assignment.questions.length) * 100);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }, [progress]);

  useEffect(() => {
    if (!mobileWeeksOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMobileWeeksOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileWeeksOpen]);

  function chooseWeek(nextWeek) {
    setWeek(nextWeek);
    setIndex(0);
    setMobileWeeksOpen(false);
  }

  function selectOption(optionId) {
    if (submitted) return;
    const next = isMulti
      ? selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
      : [optionId];
    setProgress((old) => ({ ...old, answers: { ...old.answers, [question.id]: { selected: next, submitted: false } } }));
  }

  function submitAnswer() {
    if (!selected.length || submitted) return;
    const isCorrect = selected.length === question.correct.length && question.correct.every((id) => selected.includes(id));
    setProgress((old) => ({ ...old, answers: { ...old.answers, [question.id]: { selected, submitted: true, isCorrect } } }));
  }

  function moveQuestion(direction) {
    setIndex((current) => Math.min(assignment.questions.length - 1, Math.max(0, current + direction)));
  }

  function resetWeek() {
    const ids = assignment.questions.map((item) => item.id);
    setProgress((old) => ({ ...old, answers: Object.fromEntries(Object.entries(old.answers).filter(([id]) => !ids.includes(id))) }));
    setIndex(0);
  }

  const weekStats = useMemo(() => assignments.map((item) => {
    const done = item.questions.filter((q) => progress.answers[q.id]?.submitted).length;
    return { week: item.week, done, total: item.questions.length };
  }), [progress]);

  const currentCorrect = submitted && answerState.isCorrect;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="NPTEL Practice home" onClick={(event) => { event.preventDefault(); chooseWeek(1); }}>
          <span className="brand-mark"><span /></span>
          <span>NPTEL<span className="brand-light"> practice</span></span>
        </a>
        <div className="exam-note"><span className="live-dot" /> Your focused practice space</div>
      </header>

      {mobileWeeksOpen && <button className="mobile-menu-backdrop" aria-label="Close week menu" onClick={() => setMobileWeeksOpen(false)} />}

      <div className="layout">
        <aside id="week-navigation" className={`sidebar ${mobileWeeksOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-heading">
            <div><p className="eyebrow">YOUR ASSIGNMENTS</p><h2>Practice by week</h2></div>
            <div className="sidebar-heading-actions"><span className="week-count">12 weeks</span><button className="sidebar-close" aria-label="Close week menu" onClick={() => setMobileWeeksOpen(false)}><X size={17} /></button></div>
          </div>
          <nav className="week-list" aria-label="Choose an assignment week">
            {weekStats.map((item) => (
              <button className={`week-item ${week === item.week ? 'active' : ''}`} key={item.week} aria-current={week === item.week ? 'page' : undefined} onClick={() => chooseWeek(item.week)}>
                <span className="week-number">{String(item.week).padStart(2, '0')}</span>
                <span className="week-copy"><span>Week {item.week}</span><small>{item.done === item.total ? 'Completed' : `${item.done} of ${item.total} answered`}</small></span>
                <span className="week-indicator">{item.done === item.total ? <CheckCircle2 size={17} aria-label="Completed" /> : null}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-foot"><span className="foot-icon"><Sparkles size={15} /></span><p><strong>Small steps add up.</strong><br />Keep your momentum going.</p></div>
        </aside>

        <main className="main-content">
          <button className="mobile-week-button" aria-label="Choose a practice week" aria-expanded={mobileWeeksOpen} aria-controls="week-navigation" onClick={() => setMobileWeeksOpen((open) => !open)}>
            <span><small className="mobile-picker-label">PRACTICE WEEK</small><strong>Week {week}</strong><small>{doneCount} of {assignment.questions.length} answered</small></span><ChevronDown className={mobileWeeksOpen ? 'picker-chevron-open' : ''} size={18} />
          </button>

          <div className="page-heading">
            <div>
              <div className="breadcrumb"><span>Assignments</span><span className="crumb-slash">/</span><span>Week {week}</span></div>
              <h1>Week {week}<span className="title-period">.</span></h1>
              <p className="page-subtitle">Take it one question at a time. You’ve got this.</p>
            </div>
            <button className="reset-button" onClick={resetWeek} title="Clear this week's answers"><RotateCcw size={15} /><span>Start over</span></button>
          </div>

          <section className="progress-panel" aria-label="Week progress">
            <div className="progress-top"><div><span className="progress-label">YOUR PROGRESS</span><strong>{doneCount}<span> / {assignment.questions.length} questions</span></strong></div><div className="score-pill"><Check size={13} /> {rightCount} correct</div></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
            <div className="progress-bottom"><span>{percent === 100 ? 'Week complete — nicely done!' : `${percent}% complete`}</span><span>Week {week} assignment</span></div>
          </section>

          <div className="question-meta"><div><span className="question-index">QUESTION {String(index + 1).padStart(2, '0')}</span><span className="meta-divider" /><span className="question-total">of {assignment.questions.length}</span></div><span className={`type-pill ${isMulti ? 'multi' : ''}`}>{isMulti ? 'Select all that apply' : 'Choose one answer'}</span></div>

          <section className="question-card">
            <div className="question-card-top"><span className="card-kicker">WEEK {week} · ASSIGNMENT</span><span className="question-mark">{String(index + 1).padStart(2, '0')}<span>/{String(assignment.questions.length).padStart(2, '0')}</span></span></div>
            <h2 className="question-text">{question.prompt}</h2>
            {isMulti && <p className="select-hint">This question has more than one correct answer.</p>}
            <div className="options-list">
              {question.options.map((option) => {
                const chosen = selected.includes(option.id);
                const isAnswer = question.correct.includes(option.id);
                const stateClass = submitted ? isAnswer ? 'option-correct' : chosen ? 'option-wrong' : '' : chosen ? 'option-selected' : '';
                return <button className={`option ${stateClass}`} key={option.id} onClick={() => selectOption(option.id)} disabled={submitted} aria-pressed={chosen}>
                  <span className={`option-marker ${isMulti ? 'checkbox' : ''}`}>{submitted && isAnswer ? <Check size={15} /> : isMulti ? chosen ? <Check size={14} /> : null : <span />}</span>
                  <span className="option-letter">{option.id.toUpperCase()}</span><span className="option-text">{option.text}</span>
                  {submitted && isAnswer && <span className="answer-tag">Correct answer</span>}
                  {submitted && chosen && !isAnswer && <span className="answer-tag wrong-tag">Your choice</span>}
                </button>;
              })}
            </div>

            {submitted && <div className={`feedback ${currentCorrect ? 'feedback-correct' : 'feedback-wrong'}`} role="status">
              <span className="feedback-icon">{currentCorrect ? <CheckCircle2 size={19} /> : <Circle size={19} />}</span>
              <div><strong>{currentCorrect ? 'That’s right!' : 'Not quite — the correct answer is highlighted.'}</strong><p>{currentCorrect ? 'Great work. Keep that understanding moving forward.' : 'Take a moment to review the correct choice before continuing.'}</p></div>
            </div>}

            <div className="card-actions">
              <button className="nav-button previous" onClick={() => moveQuestion(-1)} disabled={index === 0}><ArrowLeft size={16} /> Previous</button>
              {submitted ? <button className="primary-button" onClick={() => moveQuestion(1)} disabled={index === assignment.questions.length - 1}>{index === assignment.questions.length - 1 ? 'Week complete' : 'Next question'}<ArrowRight size={16} /></button> : <button className="primary-button" onClick={submitAnswer} disabled={!selected.length}>Check answer <ArrowRight size={16} /></button>}
            </div>
          </section>

          <div className="question-dots" aria-label="Question navigation">{assignment.questions.map((item, dotIndex) => {
            const result = progress.answers[item.id];
            return <button key={item.id} aria-label={`Go to question ${dotIndex + 1}`} title={`Question ${dotIndex + 1}`} className={`dot ${dotIndex === index ? 'current' : ''} ${result?.submitted ? result.isCorrect ? 'dot-correct' : 'dot-wrong' : ''}`} onClick={() => setIndex(dotIndex)}>{dotIndex + 1}</button>;
          })}</div>
          <footer className="footer-note">Made for focused practice <span>·</span> Your progress saves automatically on this device</footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
