import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Moon, RotateCcw, Sparkles, Sun, X } from 'lucide-react';
import assignments from './questions.json';
import './styles.css';

const STORE_KEY = 'nptel-practice-progress-v1';
const emptyState = () => ({ answers: {}, completed: {} });
const TEST_LENGTHS = [15, 20, 30, 40, 50];

function lengthsAvailableThrough(week) {
  const available = assignments.filter((assignment) => assignment.week <= week).reduce((sum, assignment) => sum + assignment.questions.length, 0);
  const validLengths = TEST_LENGTHS.filter((length) => length <= available);
  return validLengths.length ? validLengths : [available];
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function readProgress() {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; }
  catch { return emptyState(); }
}

function readTheme() {
  try { return localStorage.getItem('nptel-theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

function TestMode({ onBack }) {
  const [stage, setStage] = useState('setup');
  const [length, setLength] = useState(20);
  const [weekLimit, setWeekLimit] = useState(assignments.length);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const availableLengths = lengthsAvailableThrough(weekLimit);
  const availableQuestionCount = assignments.filter((assignment) => assignment.week <= weekLimit).reduce((sum, assignment) => sum + assignment.questions.length, 0);

  function changeWeekLimit(event) {
    const nextWeek = Number(event.target.value);
    const nextLengths = lengthsAvailableThrough(nextWeek);
    setWeekLimit(nextWeek);
    setLength((current) => nextLengths.includes(current) ? current : nextLengths[nextLengths.length - 1]);
  }

  function startTest() {
    const pool = assignments.filter((assignment) => assignment.week <= weekLimit).flatMap((assignment) => assignment.questions.map((question) => ({ ...question, week: assignment.week })));
    setQuestions(shuffled(pool).slice(0, length));
    setAnswers({});
    setIndex(0);
    setStage('active');
  }

  function selectAnswer(question, optionId) {
    const current = answers[question.id]?.selected || [];
    const multi = question.correct.length > 1;
    const selected = multi
      ? current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      : [optionId];
    setAnswers((previous) => ({ ...previous, [question.id]: { selected } }));
  }

  function isCorrect(question) {
    const selected = answers[question.id]?.selected || [];
    return selected.length === question.correct.length && question.correct.every((id) => selected.includes(id));
  }

  if (stage === 'setup') {
    return <main className="test-content">
      <div className="test-breadcrumb">NPTEL practice <span>/</span> Test mode</div>
      <section className="test-setup-card">
        <span className="test-kicker">A QUICK CHECK OF WHAT YOU KNOW</span>
        <div className="test-hero-icon"><CheckCircle2 size={24} /></div>
        <h1>Ready for a test?</h1>
        <p className="test-intro">Choose how many questions to answer and how far through the assignments to include. Mark your answers and see your result when you finish.</p>
        <div className="week-range-block">
          <label htmlFor="test-week-limit">Include questions through</label>
          <select id="test-week-limit" value={weekLimit} onChange={changeWeekLimit}>
            <option value={assignments.length}>All weeks (1–{assignments.length})</option>
            {assignments.slice(0, -1).map((assignment) => <option value={assignment.week} key={assignment.week}>Weeks 1–{assignment.week}</option>)}
          </select>
          <p>Questions will come from Weeks 1–{weekLimit}. <strong>{availableQuestionCount} available</strong></p>
        </div>
        <div className="test-length-block">
          <div className="length-heading"><strong>Choose your test length</strong><span>{length} questions</span></div>
          <div className="length-options" role="group" aria-label="Number of test questions">
            {availableLengths.map((amount) => <button key={amount} className={amount === length ? 'length-option selected' : 'length-option'} aria-pressed={amount === length} onClick={() => setLength(amount)}>{amount === availableQuestionCount && !TEST_LENGTHS.includes(amount) ? `All ${amount}` : amount}</button>)}
          </div>
        </div>
        <div className="test-details"><span><Check size={14} /> Random questions from selected weeks</span><span><Check size={14} /> Answers revealed at the end</span></div>
        <button className="primary-button start-test-button" onClick={startTest}>Start {length}-question test <ArrowRight size={16} /></button>
        <button className="back-to-practice" onClick={onBack}><ArrowLeft size={14} /> Back to weekly practice</button>
      </section>
      <p className="test-privacy-note">Your weekly practice progress stays separate and is saved on this device.</p>
    </main>;
  }

  if (stage === 'results') {
    const score = questions.filter(isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);
    const unanswered = questions.filter((question) => !(answers[question.id]?.selected || []).length).length;
    return <main className="test-content results-content">
      <div className="test-breadcrumb">NPTEL practice <span>/</span> Test result</div>
      <section className="result-summary">
        <span className="test-kicker">TEST COMPLETE</span>
        <div className="score-circle"><strong>{percentage}<small>%</small></strong></div>
        <h1>{percentage >= 80 ? 'Excellent work!' : percentage >= 50 ? 'Good effort!' : 'Keep practicing!'}</h1>
        <p>You got <strong>{score} out of {questions.length}</strong> questions correct.{unanswered ? ` ${unanswered} ${unanswered === 1 ? 'question was' : 'questions were'} left unanswered.` : ''}</p>
        <div className="result-actions"><button className="primary-button" onClick={() => setStage('setup')}>Try another test <RotateCcw size={15} /></button><button className="secondary-button" onClick={onBack}>Weekly practice <ArrowRight size={15} /></button></div>
      </section>
      <div className="review-heading"><div><span className="test-kicker">LEARN FROM YOUR ANSWERS</span><h2>Answer review</h2></div><span>{questions.length} questions</span></div>
      <div className="review-list">
        {questions.map((question, questionIndex) => {
          const selected = answers[question.id]?.selected || [];
          const correct = isCorrect(question);
          return <article className={`review-card ${correct ? 'review-right' : 'review-needs-work'}`} key={question.id}>
            <div className="review-card-head"><span>QUESTION {String(questionIndex + 1).padStart(2, '0')} <i>·</i> WEEK {question.week}</span><strong>{correct ? <><CheckCircle2 size={14} /> Correct</> : selected.length ? 'Review answer' : 'Not answered'}</strong></div>
            <h3>{question.prompt}</h3>
            {question.options.map((option) => {
              const isAnswer = question.correct.includes(option.id);
              const wasSelected = selected.includes(option.id);
              if (!isAnswer && !wasSelected) return null;
              return <div className={`review-answer ${isAnswer ? 'review-answer-correct' : 'review-answer-wrong'}`} key={option.id}>
                <span>{option.id.toUpperCase()}</span><p>{option.text}</p><small>{isAnswer ? 'Correct answer' : 'Your answer'}</small>
              </div>;
            })}
          </article>;
        })}
      </div>
    </main>;
  }

  const question = questions[index];
  const selected = answers[question.id]?.selected || [];
  const answeredCount = questions.filter((item) => (answers[item.id]?.selected || []).length > 0).length;
  const unansweredCount = questions.length - answeredCount;
  const multi = question.correct.length > 1;

  return <main className="test-content active-test-content">
    <div className="test-breadcrumb">NPTEL practice <span>/</span> Test in progress</div>
    <div className="active-test-heading"><div><span className="test-kicker">MIXED ASSIGNMENT TEST</span><h1>Your test</h1><p>Choose your answers now. You’ll see the correct ones after you finish.</p></div><button className="exit-test-button" onClick={() => setStage('setup')}>Exit test</button></div>
    <section className="test-progress-card"><div className="test-progress-top"><span><strong>{answeredCount}</strong> of {questions.length} answered</span><span>Question {index + 1} of {questions.length}</span></div><div className="test-progress-track"><div style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div></section>
    <section className="question-card test-question-card">
      <div className="question-card-top"><span className="card-kicker">WEEK {question.week} · QUESTION {String(index + 1).padStart(2, '0')}</span><span className={`type-pill ${multi ? 'multi' : ''}`}>{multi ? 'Select all that apply' : 'Choose one answer'}</span></div>
      <h2 className="question-text">{question.prompt}</h2>
      {multi && <p className="select-hint">This question has more than one correct answer.</p>}
      <div className="options-list">
        {question.options.map((option) => <button key={option.id} className={`option ${selected.includes(option.id) ? 'option-selected' : ''}`} onClick={() => selectAnswer(question, option.id)} aria-pressed={selected.includes(option.id)}>
          <span className={`option-marker ${multi ? 'checkbox' : ''}`}>{selected.includes(option.id) ? multi ? <Check size={14} /> : <span /> : null}</span><span className="option-letter">{option.id.toUpperCase()}</span><span className="option-text">{option.text}</span>
        </button>)}
      </div>
      <div className="test-card-actions"><button className="nav-button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}><ArrowLeft size={16} /> Previous</button>{index < questions.length - 1 ? <button className="primary-button" onClick={() => setIndex((current) => current + 1)}>Next question <ArrowRight size={16} /></button> : <button className="primary-button finish-test-button" onClick={() => setStage('results')}>Finish test <CheckCircle2 size={16} /></button>}</div>
    </section>
    <div className="test-question-nav" aria-label="Test question navigation">{questions.map((item, dotIndex) => <button key={item.id} className={`${dotIndex === index ? 'current' : ''} ${(answers[item.id]?.selected || []).length ? 'answered' : ''}`} aria-label={`Go to test question ${dotIndex + 1}`} aria-current={dotIndex === index ? 'step' : undefined} onClick={() => setIndex(dotIndex)}>{dotIndex + 1}</button>)}</div>
    <div className={`test-reminder ${unansweredCount ? '' : 'all-answered'}`}>{unansweredCount ? `${unansweredCount} ${unansweredCount === 1 ? 'question' : 'questions'} still unanswered` : 'All questions answered — finish when you’re ready.'}{index !== questions.length - 1 && <button onClick={() => setStage('results')}>Finish test <ArrowRight size={14} /></button>}</div>
  </main>;
}

function App() {
  const [week, setWeek] = useState(1);
  const [mode, setMode] = useState('practice');
  const [theme, setTheme] = useState(readTheme);
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
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('nptel-theme', theme); } catch { /* Theme still applies for this session. */ }
  }, [theme]);

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
        <div className="topbar-actions">
          <nav className="mode-switch" aria-label="Choose practice mode">
            <button className={mode === 'practice' ? 'mode-active' : ''} aria-current={mode === 'practice' ? 'page' : undefined} onClick={() => { setMobileWeeksOpen(false); setMode('practice'); }}>Practice</button>
            <button className={mode === 'test' ? 'mode-active' : ''} aria-current={mode === 'test' ? 'page' : undefined} onClick={() => { setMobileWeeksOpen(false); setMode('test'); }}>Test</button>
          </nav>
          <button className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="exam-note"><span className="live-dot" /> Your focused practice space</div>
        </div>
      </header>

      {mode === 'practice' && mobileWeeksOpen && <button className="mobile-menu-backdrop" aria-label="Close week menu" onClick={() => setMobileWeeksOpen(false)} />}

      <div className="layout test-layout" hidden={mode !== 'test'}><TestMode onBack={() => { setMobileWeeksOpen(false); setMode('practice'); }} /></div>
      <div className="layout" hidden={mode === 'test'}>
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
