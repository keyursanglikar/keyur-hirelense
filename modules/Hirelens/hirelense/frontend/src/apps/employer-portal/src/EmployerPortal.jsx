import React, { useState, useEffect } from 'react';
import authService from '../../../shared/services/auth.service';
import openingService from '../../../shared/services/opening.service';
import candidateService from '../../../shared/services/candidate.service';
import flowService from '../../../shared/services/flow.service';
import scorecardService from '../../../shared/services/scorecard.service';
import emailjs from '@emailjs/browser';
import * as XLSX from 'xlsx';
import mockClient from '../../../shared/api/client';

// --- TIMEZONE / UTC FORMATTING UTILITY ---
const formatLocalTime = (utcString) => {
  if (!utcString || utcString === '—') return "—";
  try {
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return utcString; // Fallback if it's already a formatted string like "16 Jul"
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch (e) {
    return utcString;
  }
};

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
};

// --- DEFAULT TEMPLATES AND SCORECARDS ---
const DEFAULT_INTERVIEW_FLOW = {
  id: "default-flow",
  name: "Default Interview Flow",
  jobTitle: "Generic",
  department: "General",
  description: "Standard screening template for standard positions.",
  version: "v1",
  is_live: true,
  rounds: [
    { id: 1, type: "form", name: "Introduction Details", description: "Collect qualifications and notice period", questions: [{ id: 101, question: "Introduce yourself & qualifications", answer: "General details", timeLimit: 2, required: true, difficulty: "Easy" }] },
    { id: 2, type: "tech", name: "Technical Fundamentals", description: "Core role technical fundamentals", questions: [{ id: 102, question: "Core role technical fundamentals", answer: "Standard technical answers", timeLimit: 8, required: true, difficulty: "Medium" }] },
    { id: 3, type: "hr", name: "Behavioral Assessment", description: "Behavioral & career alignment questions", questions: [{ id: 103, question: "Behavioral & career alignment questions", answer: "Positive communication and attitude", timeLimit: 5, required: true, difficulty: "Medium" }] },
    { id: 4, type: "hr", name: "Final Discussion", description: "Salary expectation and notice period", questions: [{ id: 104, question: "Salary expectation, notice period and final query", answer: "Fit within budget guidelines", timeLimit: 5, required: true, difficulty: "Easy" }] }
  ]
};

const DEFAULT_SCORECARD = {
  id: "default-scard",
  name: "Default Scorecard",
  jobTitle: "Generic",
  department: "General",
  description: "Standard balanced evaluation framework.",
  is_live: true,
  criteria: [
    { name: "Technical Skills", maxMarks: 10, weight: 25, mandatory: true },
    { name: "Communication", maxMarks: 10, weight: 25, mandatory: true },
    { name: "Problem Solving", maxMarks: 10, weight: 25, mandatory: true },
    { name: "Culture Fit", maxMarks: 10, weight: 25, mandatory: false }
  ]
};

const INITIAL_TEMPLATES = [
  {
    id: 1,
    name: "Audit & Tax Screening",
    jobTitle: "Audit & Tax Executive",
    department: "Audit & Tax",
    description: "Tax audit, statutory audit, GST filings and TDS compliance screening.",
    version: "v2",
    is_live: true,
    rounds: [
      {
        id: 1,
        type: "form",
        name: "Form Screening",
        description: "Verify qualifications and basic screening info",
        questions: [
          { id: 11, question: "Tell us about your highest qualification and attempts.", answer: "CA, M.Com or B.Com. Detail attempts if any.", timeLimit: 2, required: true, difficulty: "Easy" },
          { id: 12, question: "What is your current notice period?", answer: "Immediate, 15 days, 30 days.", timeLimit: 1, required: true, difficulty: "Easy" }
        ]
      },
      {
        id: 2,
        type: "hr",
        name: "HR Round",
        description: "Verify soft skills and cultural fit parameters",
        questions: [
          { id: 13, question: "Tell me about yourself and what draws you to audit and taxation.", answer: "Clear career arc, genuine interest in compliance.", timeLimit: 4, required: true, difficulty: "Easy" },
          { id: 14, question: "Describe a deadline you nearly missed. What changed afterwards?", answer: "Honest Near-miss details, concrete action plan.", timeLimit: 4, required: true, difficulty: "Medium" }
        ]
      },
      {
        id: 3,
        type: "tech",
        name: "Technical Screening",
        description: "Assess accounting and audit principles knowledge",
        questions: [
          { id: 15, question: "Explain the difference between a tax audit u/s 44AB and a statutory audit under the Companies Act.", answer: "Thresholds, form types, reporting authorities.", timeLimit: 5, required: true, difficulty: "Hard" },
          { id: 16, question: "A client repairs a machine for 3L. Capitalise or expense — how do you decide?", answer: "Enhancement vs restoration test, AS 10 rules.", timeLimit: 5, required: true, difficulty: "Medium" }
        ]
      },
      {
        id: 4,
        type: "case",
        name: "Case Analysis",
        description: "Reconcile real-world ASMT notices",
        questions: [
          { id: 17, question: "ASMT-10 notice: GSTR-3B ITC exceeds 2B by 4.2L. Walk through your cause analysis and reply.", answer: "Timing diffs, vendor default, reconciliation steps.", timeLimit: 7, required: true, difficulty: "Hard" }
        ]
      },
      {
        id: 5,
        type: "mcq",
        name: "Objective Test",
        description: "MCQ screening on GST regulations",
        questions: [
          { id: 18, question: "ITC on motor vehicles for transport of persons (seating <= 13) is blocked, except when used for—", answer: "Further supply of such vehicles", timeLimit: 1, required: true, difficulty: "Easy" },
          { id: 19, question: "Under AS 2 / Ind AS 2, inventories are valued at—", answer: "Lower of cost and NRV", timeLimit: 1, required: true, difficulty: "Easy" }
        ]
      }
    ]
  },
  {
    id: 2,
    name: "CA Articleship Screening",
    jobTitle: "Article Assistant",
    department: "Audit",
    description: "CA articleship screening for standard accounting candidates.",
    version: "v1",
    is_live: true,
    rounds: [
      {
        id: 6,
        type: "form",
        name: "Academics Form",
        description: "Verify inter attempts",
        questions: [
          { id: 21, question: "CA Inter groups cleared and attempts", answer: "Both groups, first attempt", timeLimit: 2, required: true, difficulty: "Easy" }
        ]
      },
      {
        id: 7,
        type: "hr",
        name: "HR Fit",
        description: "Assess learning attitude",
        questions: [
          { id: 22, question: "Why do you want to pursue articleship at our firm?", answer: "Eagerness to learn, knowledge of our client list.", timeLimit: 4, required: true, difficulty: "Easy" }
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Sales Executive Screening",
    jobTitle: "Sales Executive",
    department: "Sales",
    description: "Sales executive screening with negotiation case play.",
    version: "v1",
    is_live: true,
    rounds: [
      {
        id: 8,
        type: "hr",
        name: "Elevator Pitch",
        description: "Test presentation skills",
        questions: [
          { id: 31, question: "Introduce yourself and pitch our product in 2 minutes.", answer: "Clear communication, confident delivery.", timeLimit: 3, required: true, difficulty: "Medium" }
        ]
      }
    ]
  }
];

const INITIAL_SCARDS = [
  {
    id: 1,
    name: "Audit & Tax Scorecard",
    jobTitle: "Audit & Tax Executive",
    department: "Audit & Tax",
    description: "Core evaluation criteria for senior tax and audit roles.",
    is_live: true,
    criteria: [
      { name: "Domain knowledge", maxMarks: 10, weight: 30, mandatory: true },
      { name: "Communication", maxMarks: 10, weight: 20, mandatory: true },
      { name: "Problem Solving", maxMarks: 10, weight: 20, mandatory: true },
      { name: "Ownership & attitude", maxMarks: 10, weight: 15, mandatory: false },
      { name: "Culture Fit", maxMarks: 10, weight: 15, mandatory: false }
    ]
  },
  {
    id: 2,
    name: "Articleship Scorecard",
    jobTitle: "Article Assistant",
    department: "Audit",
    description: "CA articleship screening scorecard.",
    is_live: true,
    criteria: [
      { name: "Fundamentals", maxMarks: 10, weight: 35, mandatory: true },
      { name: "Learning attitude", maxMarks: 10, weight: 25, mandatory: true },
      { name: "Communication", maxMarks: 10, weight: 20, mandatory: false },
      { name: "Culture Fit", maxMarks: 10, weight: 20, mandatory: false }
    ]
  }
];

const INITIAL_OPENINGS = [
  {
    id: 1,
    title: "Audit & Tax Executive",
    description: "Tax audit and statutory audit compliance and client management.",
    department: "Audit & Tax",
    employment_type: "Full-time",
    experience: "1–3 yrs",
    location: "Pune, on-site",
    salary: "₹4.5 - ₹6.0 LPA",
    hiring_manager: "CA Rajesh Kulkarni",
    status: "Live",
    interview_flow_id: 1,
    scorecard_id: 1,
    created_at: "2026-07-02T09:00:00Z",
    invited: 250,
    completed: 182,
    shortlisted: 9,
    meta: "Pune · Full-time · 1–3 yrs · posted 02 Jul 2026"
  },
  {
    id: 2,
    title: "Article Assistant — 2026 intake",
    description: "Articleship training for CA intermediate cleared candidates.",
    department: "Audit",
    employment_type: "Articleship",
    experience: "Fresher",
    location: "Pune, on-site",
    salary: "Stipend as per ICAI",
    hiring_manager: "Meera Kulkarni",
    status: "Draft",
    interview_flow_id: null,
    scorecard_id: null,
    created_at: "2026-07-23T06:00:00Z",
    invited: 0,
    completed: 0,
    shortlisted: 0,
    meta: "Pune · Articleship · CA Inter · opens Aug 2026"
  }
];

const INITIAL_CANDS = [
  { n: "Priya Sharma", st: "Shortlisted", sc: 82, fl: 0, d: "2026-07-16T10:30:00Z", rep: true },
  { n: "Rahul Deshmukh", st: "Scored", sc: 74, fl: 0, d: "2026-07-16T11:45:00Z" },
  { n: "Sneha Kulkarni", st: "Scored", sc: 68, fl: 2, d: "2026-07-15T09:15:00Z" },
  { n: "Neha Patil", st: "Scored", sc: 63, fl: 0, d: "2026-07-15T15:20:00Z" },
  { n: "Imran Shaikh", st: "In progress", sc: null, fl: 0, d: "—" },
  { n: "Kavya Nair", st: "Invited", sc: null, fl: 0, d: "—" },
  { n: "Aditya Joshi", st: "Rejected (auto)", sc: 41, fl: 0, d: "2026-07-15T16:00:00Z" },
  { n: "Tushar Bhosale", st: "Rejected (auto)", sc: 37, fl: 1, d: "2026-07-14T11:10:00Z" }
];

const TRANSCRIPT = [
  { q: "Q1 · Tell me about yourself and what draws you to audit and taxation.", ts: "00:41", sc: "8.8", a: "Two years with a mid-size Pune firm across GST compliance and tax audits. “What I enjoy is that every notice is a puzzle with a legal answer — you can actually close it.” Clear arc: articleship → compliance → wants advisory exposure." },
  { q: "Q2 · A deadline you nearly missed — what changed afterwards?", ts: "05:12", sc: "7.4", a: "Sept GSTR-9 crunch, client sent books late. Escalated on day 2, split reconciliation with a colleague, filed with hours to spare. Now front-loads document requests by two weeks. Honest about the early mistake." },
  { q: "Q3 · Staying accurate under busy-season pressure.", ts: "09:38", sc: "7.6", a: "Maker-checker habit even when solo — self-review the next morning. Maintains a personal error log; says repeat errors dropped after she started it." },
  { q: "Q4 · Tax audit u/s 44AB vs statutory audit under the Companies Act.", ts: "14:06", sc: "8.6", a: "Correctly separated purpose, appointing authority, applicability thresholds and reporting forms (3CA/3CB-3CD vs audit report to members). Added turnover-limit nuance for F&O clients, unprompted." },
  { q: "Q5 · Capitalise or expense a ₹3L machine repair?", ts: "18:22", sc: "7.9", a: "Framed the test as enhancement of future benefit vs restoration; asked what she'd check — nature of work, useful-life impact, capacity change. Cited AS 10 treatment correctly." },
  { q: "Q6 · Monthly GST compliance calendar for a mid-size trading client.", ts: "22:48", sc: "8.2", a: "Ran the calendar in order — GSTR-1 by the 11th, 2B reconciliation, 3B by the 20th, vendor follow-ups for missing credits, quarterly touchpoints. Process-driven, not recited." },
  { q: "Case · ASMT-10 notice, ₹4.2L ITC mismatch.", ts: "28:19", sc: "8.1", a: "Causes to check: timing differences, vendor non-filing, credit notes, RCM entries. Would call for purchase register, 2B downloads, vendor GSTR-1 status. Reply structure: reconcile item-wise, annex evidence, pay-with-interest only where genuinely ineligible." }
];

const MODELS = [
  { id: "sonnet", name: "Claude Sonnet", note: "Best judgement · recommended", rate: 1.2, report: 6, mcq: 0.3 },
  { id: "haiku", name: "Claude Haiku", note: "Fast, high-volume screens", rate: 0.5, report: 2.5, mcq: 0.12 },
  { id: "gptm", name: "GPT-4o mini", note: "Balanced alternative", rate: 0.65, report: 3, mcq: 0.15 },
  { id: "flash", name: "Gemini Flash", note: "Lowest cost", rate: 0.4, report: 2, mcq: 0.1 }
];

const ROUND_TYPES = {
  form: { label: "Pre-screen form", cam: false, pool: null },
  hr: { label: "Video — HR conversation", cam: true, pool: "hr" },
  tech: { label: "Video — Technical Q&A", cam: true, pool: "tech" },
  case: { label: "Case study (on camera)", cam: true, pool: "case" },
  mcq: { label: "Knowledge test (MCQ)", cam: false, pool: "mcq" }
};

// --- SMART TEMPLATE DETECTOR ALGORITHM ---
const calculateMatchScore = (jobTitle, jobDesc, jobDept, jobType, jobExp, template) => {
  let score = 0;
  let totalPoints = 0;

  const titleText = (jobTitle || "").toLowerCase();
  const descText = (jobDesc || "").toLowerCase();
  const deptText = (jobDept || "").toLowerCase();

  const tmplTitle = (template.jobTitle || "").toLowerCase();
  const tmplName = (template.name || "").toLowerCase();
  const tmplDept = (template.department || "").toLowerCase();
  const tmplDesc = (template.description || "").toLowerCase();

  // 1. Job Title Match (Highest weight: 45 points)
  totalPoints += 45;
  if (tmplTitle && (titleText.includes(tmplTitle) || tmplTitle.includes(titleText))) {
    score += 45;
  } else {
    const titleWords = titleText.split(/\s+/).filter(w => w.length > 2);
    const tmplWords = (tmplTitle + " " + tmplName).toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let wordMatches = 0;
    titleWords.forEach(w => {
      if (tmplWords.some(tw => tw.includes(w) || w.includes(tw))) {
        wordMatches++;
      }
    });
    if (titleWords.length > 0) {
      score += Math.min(45, Math.round((wordMatches / titleWords.length) * 45));
    }
  }

  // 2. Department Match (25 points)
  totalPoints += 25;
  if (tmplDept && deptText && (deptText.includes(tmplDept) || tmplDept.includes(deptText))) {
    score += 25;
  }

  // 3. Description Match (30 points)
  totalPoints += 30;
  const descWords = descText.split(/\s+/).filter(w => w.length > 3);
  let descMatches = 0;
  const sampleWords = descWords.slice(0, 10);
  if (sampleWords.length > 0) {
    sampleWords.forEach(w => {
      if (tmplDesc.includes(w)) descMatches++;
    });
    score += Math.round((descMatches / sampleWords.length) * 30);
  } else {
    score += 15; // default buffer
  }

  return Math.min(100, Math.max(10, score));
};

export default function EmployerPortal() {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [screen, setScreen] = useState('dash'); // dash, openings, pipeline, report, flow, scorecard, settings
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [protoMenuOpen, setProtoMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  // Core Data States (All stored in Client-side state)
  const [openings, setOpenings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Selection states in Flow editor (existing screen views)
  const [activeFlowId, setActiveFlowId] = useState(1);
  const [flowTab, setFlowTab] = useState('rounds'); // rounds, questions
  const [selectedWizRoundIdx, setSelectedWizRoundIdx] = useState(0);
  const [activeModel, setActiveModel] = useState('sonnet');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [selectedOpeningId, setSelectedOpeningId] = useState(null);

  // Question editing inside existing flows
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionRub, setNewQuestionRub] = useState('');
  const [newQuestionTimeLimit, setNewQuestionTimeLimit] = useState(5);
  const [newQuestionFeed, setNewQuestionFeed] = useState('Domain knowledge');
  const [newQuestionType, setNewQuestionType] = useState('');

  // Report Specific
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [partnerNoteText, setPartnerNoteText] = useState('');

  // Settings State
  const [settingsTab, setSettingsTab] = useState('team');
            
  const saveIntegrations = async () => {
    try {
      await mockClient.post('/api/firms/gdrive-settings/', {
        service_account_json: gdriveJson,
        folder_id: gdriveFolderId
      });
      await mockClient.post('/api/firms/email-settings/', {
        service_id: emailjsServiceId,
        template_id: emailjsTemplateId,
        public_key: emailjsPublicKey
      });
      triggerToast('Integrations updated successfully.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save integrations.');
    }
  };


  // Fetch Firm Subscription details
  useEffect(() => {
    if (isLoggedIn) {
      mockClient.get('/api/firms/ca/modules/').then(res => {
        if (res.data && res.data.modules) {
          const hlModule = res.data.modules.find(m => m.slug === 'hirelense');
          if (hlModule) {
            setSubscriptionDetails(hlModule);
          }
        }
      }).catch(err => console.error("Error fetching subscription:", err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (screen === 'settings' && settingsTab === 'integrations') {
      mockClient.get('/api/firms/gdrive-settings/').then(res => {
        if (res.data) {
          setGdriveJson(res.data.service_account_json || '');
          setGdriveFolderId(res.data.folder_id || '');
        }
      }).catch(e => console.error(e));
      
      mockClient.get('/api/firms/email-settings/').then(res => {
        if (res.data) {
          setEmailjsServiceId(res.data.service_id || '');
          setEmailjsTemplateId(res.data.template_id || '');
          setEmailjsPublicKey(res.data.public_key || '');
        }
      }).catch(e => console.error(e));
    }
  }, [screen, settingsTab]);
  const [activeBrandColor, setActiveBrandColor] = useState('#155048');

  // Invitations Management State
  const [invitations, setInvitations] = useState([]);
  const [invFilter, setInvFilter] = useState('all');
  const [invSearch, setInvSearch] = useState('');

  // --- MODALS STATES ---
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState('one'); // one, bulk
  const [inviteOpeningId, setInviteOpeningId] = useState('1');
  const [inviteExpiryHours, setInviteExpiryHours] = useState(48);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    if (openings && openings.length > 0) {
      setInviteOpeningId(String(openings[0].id));
    }
  }, [openings]);

  // Job Opening Wizard State
  const [wizOpen, setWizOpen] = useState(false);
  const [wizStep, setWizStep] = useState(1);
  // Step 1 Details
  const [wizTitle, setWizTitle] = useState('Senior Backend Developer');
  const [wizDesc, setWizDesc] = useState('Responsible for microservices design, REST API endpoints, and SQL queries.');
  const [wizDept, setWizDept] = useState('Engineering');
  const [wizLocation, setWizLocation] = useState('Pune, hybrid');
  const [wizSalary, setWizSalary] = useState('₹8.0 - ₹12.0 LPA');
  const [wizHiringManager, setWizHiringManager] = useState('Jay Sir');
  const [wizType, setWizType] = useState('Full-time');
  const [wizExp, setWizExp] = useState('2–5 years');
  const [wizDefaultDuration, setWizDefaultDuration] = useState('60 Minutes');
  
  // Step 2 & 3 Selections
  const [wizAttachedFlowId, setWizAttachedFlowId] = useState(null); // template ID
  const [wizAttachedScorecardId, setWizAttachedScorecardId] = useState(null); // scorecard ID
  const [flowPreviewOpen, setFlowPreviewOpen] = useState(null); // ID of previewing flow
  const [scorecardPreviewOpen, setScorecardPreviewOpen] = useState(null); // ID of previewing scorecard
  const [wizEditingJobId, setWizEditingJobId] = useState(null);
  const [wizSearchFlowOpen, setWizSearchFlowOpen] = useState(false);
  const [wizSearchScorecardOpen, setWizSearchScorecardOpen] = useState(false);

  // Create Interview Flow Template Wizard
  const [flowWizOpen, setFlowWizOpen] = useState(false);
  const [flowWizStep, setFlowWizStep] = useState(1);
  const [flowWizEditingId, setFlowWizEditingId] = useState(null); // null = add, number = template ID
  const [flowWizName, setFlowWizName] = useState('');
  const [flowWizTitle, setFlowWizTitle] = useState('');
  const [flowWizDept, setFlowWizDept] = useState('');
  const [flowWizDesc, setFlowWizDesc] = useState('');
  const [flowWizVersion, setFlowWizVersion] = useState('v1');
  const [flowWizRounds, setFlowWizRounds] = useState([
    { id: 1, type: 'form', name: 'Pre-screen Form', description: 'Collect qualifications and notice period', questions: [{ id: 901, question: 'Highest qualifications', answer: 'CA/Engineering/MBA', timeLimit: 2, required: true, difficulty: 'Easy' }] }
  ]);
  const [flowWizSelectedRoundIdx, setFlowWizSelectedRoundIdx] = useState(0);
  const [flowWizTab, setFlowWizTab] = useState('rounds');
  const [flowWizModel, setFlowWizModel] = useState('flash');
  const [flowWizOriginalData, setFlowWizOriginalData] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const [confirmUnsavedOpen, setConfirmUnsavedOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);
  const [deleteJobConfirmOp, setDeleteJobConfirmOp] = useState(null);
  const [openFlowMenuId, setOpenFlowMenuId] = useState(null);
  const [openScorecardMenuId, setOpenScorecardMenuId] = useState(null);
  const [deleteFlowConfirmOp, setDeleteFlowConfirmOp] = useState(null);
  const [deleteScorecardConfirmOp, setDeleteScorecardConfirmOp] = useState(null);

  // --- NEW ADD ROUND / ADD QUESTION POPUPS STATE ---
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [roundModalEditIdx, setRoundModalEditIdx] = useState(null); // null = add, number = edit index
  const [roundModalName, setRoundModalName] = useState('');
  const [roundModalDesc, setRoundModalDesc] = useState('');
  const [roundModalType, setRoundModalType] = useState('tech');
  const [roundModalNameError, setRoundModalNameError] = useState('');

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionModalEditIdx, setQuestionModalEditIdx] = useState(null); // null = add, number = edit index
  const [questionModalText, setQuestionModalText] = useState('');
  const [questionModalType, setQuestionModalType] = useState('');
  const [questionModalAnswer, setQuestionModalAnswer] = useState('');
  const [questionModalDifficulty, setQuestionModalDifficulty] = useState('Medium');
  const [questionModalMarks, setQuestionModalMarks] = useState(10);
  const [questionModalTimeLimit, setQuestionModalTimeLimit] = useState(5);
  const [questionModalRequired, setQuestionModalRequired] = useState(true);
  const [questionModalHints, setQuestionModalHints] = useState('');
  const [questionModalTextError, setQuestionModalTextError] = useState('');
  const [questionModalTypeError, setQuestionModalTypeError] = useState('');
  const [questionModalTimeError, setQuestionModalTimeError] = useState('');
  const [mcqList, setMcqList] = useState([
    {
      id: Date.now(),
      question: '',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ],
      correctAnswer: null,
      marks: 5,
      difficulty: 'Medium'
    }
  ]);
  const [mcqCollapsedStates, setMcqCollapsedStates] = useState({});

  const [roundDeleteConfirmIdx, setRoundDeleteConfirmIdx] = useState(null);
  const [isEditingMainFlowRounds, setIsEditingMainFlowRounds] = useState(false);

  // Create Scorecard Modal
  const [scardWizOpen, setScardWizOpen] = useState(false);
  const [scardWizEditingId, setScardWizEditingId] = useState(null);
  const [scardWizName, setScardWizName] = useState('');
  const [scardWizTitle, setScardWizTitle] = useState('');
  const [scardWizDept, setScardWizDept] = useState('');
  const [scardWizDesc, setScardWizDesc] = useState('');
  const [scardWizCriteria, setScardWizCriteria] = useState([
    { name: 'Technical Skills', maxMarks: 10, weight: 40, mandatory: true },
    { name: 'Communication', maxMarks: 10, weight: 30, mandatory: true },
    { name: 'Problem Solving', maxMarks: 10, weight: 30, mandatory: true }
  ]);

  const [scardWizAutoRejectThreshold, setScardWizAutoRejectThreshold] = useState(50);
  const [scardWizRatingScale, setScardWizRatingScale] = useState('1-10');
  const [scardWizHardGateParam, setScardWizHardGateParam] = useState('Technical Skills');

  // Scorecard Criteria builder temporary fields
  const [newCritName, setNewCritName] = useState('');
  const [newCritMax, setNewCritMax] = useState(10);
  const [newCritWeight, setNewCritWeight] = useState(20);
  const [newCritMandatory, setNewCritMandatory] = useState(true);

  // --- TOAST TRIGGER ---
  const triggerToast = (msg) => {
    setToast({ show: true, msg });
  };
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ show: false, msg: '' }), 3600);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  // --- EMPLOYER PROFILE STATES & HANDLERS ---
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileRole, setProfileRole] = useState('Admin');
  const [profileDob, setProfileDob] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profileOrg, setProfileOrg] = useState('');

  // Password reset fields
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');

  // Update profile fields when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      setProfileFirstName(currentUser.first_name || '');
      setProfileLastName(currentUser.last_name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAddress(currentUser.address || '');
      setProfileRole(currentUser.role || 'Admin');
      setProfileDob(currentUser.dob || '');
      setProfilePic(currentUser.profile_pic || '');
      setProfileOrg(currentUser.tenant_name || '');
    }
  }, [currentUser]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        triggerToast("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        triggerToast("Profile picture uploaded! Click 'Save Profile' to persist.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileFirstName || !profileLastName) {
      triggerToast("First and Last name are required.");
      return;
    }
    try {
      const updatedData = {
        first_name: profileFirstName,
        last_name: profileLastName,
        phone: profilePhone,
        address: profileAddress,
        role: profileRole,
        dob: profileDob,
        profile_pic: profilePic,
        tenant_name: profileOrg
      };
      const updatedUser = await authService.updateProfile(updatedData);
      setCurrentUser(updatedUser);
      triggerToast("Profile updated successfully!");
    } catch (err) {
      triggerToast(err.message || "Error updating profile. Try again.");
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!profileCurrentPassword || !profileNewPassword || !profileConfirmPassword) {
      triggerToast("All password fields are required.");
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      triggerToast("New passwords do not match.");
      return;
    }
    if (profileNewPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.");
      return;
    }
    try {
      await authService.changePassword(profileCurrentPassword, profileNewPassword);
      setLoginPassword(profileNewPassword);
      setProfileCurrentPassword('');
      setProfileNewPassword('');
      setProfileConfirmPassword('');
      triggerToast("Password reset successfully! Use your new password on next login.");
    } catch (err) {
      triggerToast(err.message || "Error resetting password.");
    }
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenCardMenuId(null);
      setOpenFlowMenuId(null);
      setOpenScorecardMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Load initial backend data
  useEffect(() => {
    const loadInitialData = async () => {
      // Check auth immediately
      if (authService.isAuthenticated()) {
        setIsLoggedIn(true);
        setCurrentUser(authService.getCurrentUser());
      }
      
      try {
        setIsLoading(true);
        const [ops, tmpls, scs, cands] = await Promise.all([
          openingService.getOpenings(),
          flowService.getFlows(),
          scorecardService.getScorecards(),
          candidateService.getCandidates()
        ]);
        const mappedOps = ops.map(op => ({
          ...op,
          interview_flow_id: op.flow !== undefined ? op.flow : op.interview_flow_id,
          scorecard_id: op.scorecard !== undefined ? op.scorecard : op.scorecard_id
        }));
        setOpenings(mappedOps);
        setTemplates(tmpls);
        setScorecards(scs);
        setCandidates(cands);
      } catch (e) {
        console.error("Error loading initial data", e);
        triggerToast("Failed to connect to backend api simulation.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const fetchCandidatesData = async () => {
    try {
      const cands = await candidateService.getCandidates();
      setCandidates(cands);
    } catch (e) {
      console.error("Error fetching candidates:", e);
    }
  };

  // Poll candidates list in the background when viewing pipeline
  useEffect(() => {
    if (screen === 'pipeline') {
      fetchCandidatesData();
      const interval = setInterval(fetchCandidatesData, 5000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // Update partner note state when activeCandidate changes
  useEffect(() => {
    if (activeCandidate) {
      setPartnerNoteText(activeCandidate.partner_note || '');
    }
  }, [activeCandidate]);

  // --- CALCULATIONS FOR ACTIVE FLOW TEMPLATE ---
  const DEFAULT_FLOW_FALLBACK = {
    id: 1,
    name: 'Standard CA Candidate Flow',
    jobTitle: 'Audit & Tax Executive',
    department: 'Audit & Tax',
    description: 'Pre-screening HR and Technical rounds.',
    version: 'v1',
    ai_model: 'sonnet',
    rounds: [
      { id: '1', type: 'form', dur: 5, questions: [] },
      { id: '2', type: 'hr', dur: 10, questions: [] },
      { id: '3', type: 'tech', dur: 15, questions: [] }
    ]
  };

  const activeFlow = templates.find(t => t.id === activeFlowId) || templates[0] || DEFAULT_FLOW_FALLBACK;
  
  useEffect(() => {
    if (activeFlow && activeFlow.ai_model) {
      setActiveModel(activeFlow.ai_model);
    }
  }, [activeFlow]);

  const getFlowCalculatedDuration = (flow) => {
    if (!flow || !flow.rounds) return 0;
    return flow.rounds.reduce((total, r) => {
      if (!r.questions) return total;
      return total + r.questions.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 0), 0);
    }, 0);
  };

  const getRoundCalculatedDuration = (round) => {
    if (!round || !round.questions) return 0;
    return round.questions.reduce((sum, q) => sum + (parseInt(q.timeLimit) || 0), 0);
  };

  // --- RELEVANCE MATCH RANKING ---
  const getRankedFlowTemplates = () => {
    return templates
      .map(t => {
        const score = calculateMatchScore(wizTitle, wizDesc, wizDept, wizType, wizExp, t);
        return { template: t, score };
      })
      .sort((a, b) => b.score - a.score);
  };

  const getRankedScorecardTemplates = () => {
    return scorecards
      .map(s => {
        const score = calculateMatchScore(wizTitle, wizDesc, wizDept, wizType, wizExp, s);
        return { template: s, score };
      })
      .sort((a, b) => b.score - a.score);
  };

  // --- HANDLERS ---
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    try {
      const data = await authService.login(loginEmail, loginPassword);
      setIsLoggedIn(true);
      setCurrentUser(data.user);
      setScreen('dash');
      triggerToast(`Welcome back, ${data.user.first_name}! Signed in successfully.`);
    } catch (err) {
      triggerToast("Invalid email or password.");
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    
    const role = sessionStorage.getItem('role');
    if (role === 'super_admin') {
      window.location.href = '/superadmin/dashboard';
    } else if (role === 'firm_admin') {
      window.location.href = '/firm/dashboard';
    } else if (role === 'staff') {
      window.location.href = '/staff/dashboard';
    } else {
      window.location.href = '/login';
    }
  };

  // --- MODAL ACTIONS: CREATE / EDIT ROUNDS ---
  const handleOpenRoundModal = (editIdx = null) => {
    setRoundModalNameError('');
    setIsEditingMainFlowRounds(false);
    if (editIdx !== null) {
      const r = flowWizRounds[editIdx];
      setRoundModalEditIdx(editIdx);
      setRoundModalName(r.name);
      setRoundModalDesc(r.description || '');
      setRoundModalType(r.type);
    } else {
      setRoundModalEditIdx(null);
      setRoundModalName('');
      setRoundModalDesc('');
      setRoundModalType('tech');
    }
    setRoundModalOpen(true);
  };

  const handleOpenMainRoundModal = () => {
    setRoundModalNameError('');
    setIsEditingMainFlowRounds(true);
    setRoundModalEditIdx(null);
    setRoundModalName('');
    setRoundModalDesc('');
    setRoundModalType('tech');
    setRoundModalOpen(true);
  };

  const handleSaveRoundModal = () => {
    if (!roundModalName.trim()) {
      setRoundModalNameError("Round Name is mandatory.");
      return;
    }

    if (isEditingMainFlowRounds) {
      const newRound = {
        id: Date.now(),
        type: roundModalType,
        name: roundModalName.trim(),
        description: roundModalDesc.trim(),
        questions: []
      };
      const updated = templates.map(t => {
        if (t.id === activeFlowId) {
          return {
            ...t,
            rounds: [...(t.rounds || []), newRound]
          };
        }
        return t;
      });
      setTemplates(updated);
      triggerToast(`Round "${newRound.name}" created directly in active flow.`);
      setRoundModalOpen(false);
      setIsEditingMainFlowRounds(false);
      return;
    }

    if (roundModalEditIdx !== null) {
      const updated = [...flowWizRounds];
      updated[roundModalEditIdx] = {
        ...updated[roundModalEditIdx],
        type: roundModalType,
        name: roundModalName.trim(),
        description: roundModalDesc.trim()
      };
      setFlowWizRounds(updated);
      triggerToast("Round updated successfully.");
    } else {
      const newRound = {
        id: Date.now(),
        type: roundModalType,
        name: roundModalName.trim(),
        description: roundModalDesc.trim(),
        questions: []
      };
      const updated = [...flowWizRounds, newRound];
      setFlowWizRounds(updated);
      setFlowWizSelectedRoundIdx(updated.length - 1);
      triggerToast(`Round "${newRound.name}" created and selected.`);
    }
    setRoundModalOpen(false);
  };

  const handleWizMoveRound = (idx, dir) => {
    if (dir === -1 && idx > 0) {
      const updated = [...flowWizRounds];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
      setFlowWizRounds(updated);
      setFlowWizSelectedRoundIdx(idx - 1);
    } else if (dir === 1 && idx < flowWizRounds.length - 1) {
      const updated = [...flowWizRounds];
      [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
      setFlowWizRounds(updated);
      setFlowWizSelectedRoundIdx(idx + 1);
    }
  };

  const handleConfirmDeleteRound = (idx) => {
    setRoundDeleteConfirmIdx(idx);
  };

  const executeDeleteRound = () => {
    if (roundDeleteConfirmIdx === null) return;
    const updated = flowWizRounds.filter((_, i) => i !== roundDeleteConfirmIdx);
    setFlowWizRounds(updated);
    setFlowWizSelectedRoundIdx(0);
    setRoundDeleteConfirmIdx(null);
    triggerToast("Round and all its questions deleted.");
  };

  const handleGenerateAIQuestions = async () => {
    if (flowWizRounds.length === 0) {
      triggerToast("Please add at least one round before generating questions.");
      return;
    }
    
    setIsGeneratingQuestions(true);
    triggerToast("Generating questions using Gemini Flash... Please wait.");
    
    try {
      const activeRound = flowWizRounds[flowWizSelectedRoundIdx];
      const payload = {
        title: flowWizTitle || "Generic Role",
        department: flowWizDept || "General",
        description: flowWizDesc || "Standard interview screening.",
        rounds: flowWizRounds,
        regenerate_round_type: activeRound.type,
        count: generateCount
      };
      
      const response = await flowService.generateQuestions(payload);
      
      if (response && response.questions) {
        const updated = [...flowWizRounds];
        updated[flowWizSelectedRoundIdx].questions = response.questions.map((q, idx) => {
          let mcqList = undefined;
          let correctAnswer = null;
          if (activeRound.type === 'mcq') {
            const ansChar = q.answer?.trim().toUpperCase();
            if (ansChar === 'A') correctAnswer = 0;
            else if (ansChar === 'B') correctAnswer = 1;
            else if (ansChar === 'C') correctAnswer = 2;
            else if (ansChar === 'D') correctAnswer = 3;
            else correctAnswer = 0;

            mcqList = [{
              id: Date.now() + idx + Math.random(),
              question: q.question,
              options: q.options || [
                { label: 'A', text: '' },
                { label: 'B', text: '' },
                { label: 'C', text: '' },
                { label: 'D', text: '' }
              ],
              correctAnswer: correctAnswer,
              marks: q.marks || 10,
              difficulty: q.difficulty || 'Medium'
            }];
          }

          return {
            id: Date.now() + idx + Math.random(),
            question: q.question,
            type: activeRound.type === 'mcq' ? 'MCQ' : (activeRound.type === 'case' ? 'Case Study' : 'Descriptive'),
            answer: activeRound.type === 'mcq' && mcqList ? `Correct Answers: ${mcqList.map((m) => m.options[m.correctAnswer]?.label).join(', ')}` : q.answer,
            options: q.options || (activeRound.type === 'mcq' ? [
              { label: 'A', text: '' },
              { label: 'B', text: '' },
              { label: 'C', text: '' },
              { label: 'D', text: '' }
            ] : []),
            mcqs: mcqList,
            timeLimit: q.timeLimit || 2,
            difficulty: q.difficulty || 'Medium',
            marks: q.marks || 10,
            required: true,
            hints: ''
          };
        });
        setFlowWizRounds(updated);
        triggerToast(`${generateCount} questions successfully generated for this round!`);
      }
    } catch (err) {
      console.error(err);
      triggerToast("AI question generation failed. Check your API configuration.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleRegenerateSingleQuestion = async (qIdx) => {
    setIsGeneratingQuestions(true);
    triggerToast("Regenerating question...");
    
    try {
      const activeRound = flowWizRounds[flowWizSelectedRoundIdx];
      const otherQuestions = activeRound.questions
        .filter((_, idx) => idx !== qIdx)
        .map(q => q.question);
        
      const payload = {
        title: flowWizTitle || "Generic Role",
        department: flowWizDept || "General",
        description: flowWizDesc || "Standard interview screening.",
        rounds: flowWizRounds,
        regenerate_round_type: activeRound.type,
        regenerate_question_index: qIdx,
        existing_questions: otherQuestions
      };
      
      const response = await flowService.generateQuestions(payload);
      
      if (response && response.questions && response.questions.length > 0) {
        const newQ = response.questions[0];
        const updated = [...flowWizRounds];
        updated[flowWizSelectedRoundIdx].questions[qIdx] = {
          id: Date.now() + Math.random(),
          question: newQ.question,
          type: activeRound.type === 'mcq' ? 'MCQ' : (activeRound.type === 'case' ? 'Case Study' : 'Descriptive'),
          answer: newQ.answer,
          timeLimit: newQ.timeLimit || 2,
          difficulty: newQ.difficulty || 'Medium',
          marks: newQ.marks || 10,
          required: true,
          hints: ''
        };
        setFlowWizRounds(updated);
        triggerToast("Question successfully regenerated!");
      }
    } catch (err) {
      console.error(err);
      triggerToast("AI question regeneration failed.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };
  // --- BULK UPLOAD EXCEL / CSV ---
  const downloadQuestionTemplate = () => {
    const round = flowWizRounds[flowWizSelectedRoundIdx];
    const roundName = round?.name || 'Round';
    const safeTitle = (flowWizTitle || 'Job').replace(/[^a-z0-9]/gi, '_');
    const safeRoundName = roundName.replace(/[^a-z0-9]/gi, '_');
    
    // Determine typical question type for this round
    const expectedType = round?.type === 'mcq' ? 'MCQ' : (round?.type === 'code' ? 'Code' : 'Subjective');
    
    const isMCQ = expectedType === 'MCQ';
    
    const row1 = { JobTitle: flowWizTitle || 'Job', RoundName: roundName, Type: expectedType, Question: 'Example Question 1?', ExpectedAnswer: 'Example ideal answer or code...', Difficulty: 'Easy', Marks: 5, TimeLimit: 2 };
    const row2 = { JobTitle: flowWizTitle || 'Job', RoundName: roundName, Type: expectedType, Question: 'Example Question 2?', ExpectedAnswer: 'Example ideal answer or code...', Difficulty: 'Medium', Marks: 10, TimeLimit: 5 };
    
    if (isMCQ) {
      row1.Option1 = 'Option A'; row1.Option2 = 'Option B'; row1.Option3 = 'Option C'; row1.Option4 = 'Option D'; row1.CorrectOptionIndex = 0;
      row2.Option1 = 'True'; row2.Option2 = 'False'; row2.Option3 = ''; row2.Option4 = ''; row2.CorrectOptionIndex = 1;
    }
    
    const ws = XLSX.utils.json_to_sheet([row1, row2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    const fileName = `Hirelens_${safeTitle}_${safeRoundName}_Questions.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleBulkUploadQuestions = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          triggerToast("The uploaded file is empty.");
          return;
        }

        const newQuestions = rows.map((row, idx) => {
          let rawType = String(row.Type || '').trim();
          let type = 'MCQ';
          if (/subjective|descriptive/i.test(rawType)) type = 'Descriptive';
          else if (/case study/i.test(rawType)) type = 'Case Study';
          else if (/scenario/i.test(rawType)) type = 'Scenario-Based Question';
          else if (/excel/i.test(rawType)) type = 'Excel Assessment';

          const answerStr = row['Expected Answer'] || row.ExpectedAnswer || row.Answer || row.answer || row.expectedAnswer || '';
          
          let mcqs = undefined;
          if (type === 'MCQ') {
            const options = [];
            if (row.Option1) options.push({ label: 'A', text: String(row.Option1) });
            if (row.Option2) options.push({ label: 'B', text: String(row.Option2) });
            if (row.Option3) options.push({ label: 'C', text: String(row.Option3) });
            if (row.Option4) options.push({ label: 'D', text: String(row.Option4) });

            if (options.length >= 2) {
              mcqs = [{
                id: Date.now() + idx + Math.random(),
                question: row.Question || 'Untitled Question',
                options: options,
                correctAnswer: parseInt(row.CorrectOptionIndex) || 0,
                marks: parseInt(row.Marks) || 5,
                difficulty: row.Difficulty || 'Medium'
              }];
            }
          }

          return {
            id: Date.now() + idx + Math.random(),
            type: type,
            question: row.Question || 'Untitled Question',
            difficulty: row.Difficulty || 'Medium',
            marks: parseInt(row.Marks) || 5,
            timeLimit: parseInt(row.TimeLimit) || 2,
            mcqs: mcqs,
            answer: type === 'MCQ' ? undefined : answerStr,
            required: true,
            hints: ''
          };
        });

        const updatedRounds = [...flowWizRounds];
        const currentQuestions = updatedRounds[flowWizSelectedRoundIdx].questions || [];
        updatedRounds[flowWizSelectedRoundIdx] = {
          ...updatedRounds[flowWizSelectedRoundIdx],
          questions: [...currentQuestions, ...newQuestions]
        };
        setFlowWizRounds(updatedRounds);
        triggerToast(`Successfully added ${newQuestions.length} questions in bulk!`);
      } catch (err) {
        console.error("Bulk Upload Error:", err);
        triggerToast("Failed to parse the file. Ensure it follows the template format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // reset input
  };

  // --- MODAL ACTIONS: CREATE / EDIT QUESTIONS ---
  const handleOpenQuestionModal = (editIdx = null) => {
    setQuestionModalTextError('');
    setQuestionModalTypeError('');
    setQuestionModalTimeError('');
    if (editIdx !== null) {
      const q = flowWizRounds[flowWizSelectedRoundIdx].questions[editIdx];
      setQuestionModalEditIdx(editIdx);
      setQuestionModalText(q.question);
      setQuestionModalType(q.type || '');
      setQuestionModalAnswer(q.answer || '');
      setQuestionModalDifficulty(q.difficulty || 'Medium');
      setQuestionModalMarks(q.marks || 10);
      setQuestionModalTimeLimit(q.timeLimit || 5);
      setQuestionModalRequired(q.required !== false);
      setQuestionModalHints(q.hints || '');
      if (q.type === 'MCQ') {
        const loadedMcqs = q.mcqs && q.mcqs.length > 0 ? q.mcqs.map((m, idx) => ({
          id: m.id || Date.now() + idx + Math.random(),
          question: m.question || '',
          options: m.options || [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' }
          ],
          correctAnswer: m.correctAnswer !== undefined ? m.correctAnswer : null,
          marks: m.marks || 5,
          difficulty: m.difficulty || 'Medium'
        })) : [
          {
            id: Date.now(),
            question: q.question || '',
            options: [
              { label: 'A', text: '' },
              { label: 'B', text: '' },
              { label: 'C', text: '' },
              { label: 'D', text: '' }
            ],
            correctAnswer: null,
            marks: q.marks || 5,
            difficulty: 'Medium'
          }
        ];
        setMcqList(loadedMcqs);
        setMcqCollapsedStates({});
      } else {
        setMcqList([
          {
            id: Date.now(),
            question: '',
            options: [
              { label: 'A', text: '' },
              { label: 'B', text: '' },
              { label: 'C', text: '' },
              { label: 'D', text: '' }
            ],
            correctAnswer: null,
            marks: 5,
            difficulty: 'Medium'
          }
        ]);
        setMcqCollapsedStates({});
      }
    } else {
      setQuestionModalEditIdx(null);
      setQuestionModalText('');
      setQuestionModalType('');
      setQuestionModalAnswer('');
      setQuestionModalDifficulty('Medium');
      setQuestionModalMarks(10);
      setQuestionModalTimeLimit(5);
      setQuestionModalRequired(true);
      setQuestionModalHints('');
      setMcqList([
        {
          id: Date.now(),
          question: '',
          options: [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' }
          ],
          correctAnswer: null,
          marks: 5,
          difficulty: 'Medium'
        }
      ]);
      setMcqCollapsedStates({});
    }
    setQuestionModalOpen(true);
  };

  const handleSaveQuestionModal = () => {
    let hasErr = false;
    setQuestionModalTextError('');
    setQuestionModalTypeError('');
    setQuestionModalTimeError('');

    if (!questionModalType) {
      setQuestionModalTypeError("Question Type is mandatory.");
      hasErr = true;
    }
    if (!questionModalTimeLimit || parseInt(questionModalTimeLimit) <= 0) {
      setQuestionModalTimeError("A positive Time Limit is mandatory.");
      hasErr = true;
    }

    if (questionModalType === 'MCQ') {
      let mcqErrors = [];
      mcqList.forEach((m, idx) => {
        if (!m.question.trim()) {
          mcqErrors.push(`MCQ ${idx + 1}: Question text is required.`);
        }
        if (m.options.length < 2) {
          mcqErrors.push(`MCQ ${idx + 1}: At least 2 options are required.`);
        }
        m.options.forEach((opt) => {
          if (!opt.text.trim()) {
            mcqErrors.push(`MCQ ${idx + 1}: Option ${opt.label} text cannot be empty.`);
          }
        });
        if (m.correctAnswer === null || m.correctAnswer === undefined) {
          mcqErrors.push(`MCQ ${idx + 1}: Correct answer must be selected.`);
        }
        if (!m.marks || parseInt(m.marks) <= 0) {
          mcqErrors.push(`MCQ ${idx + 1}: Marks must be greater than 0.`);
        }
      });

      if (mcqErrors.length > 0) {
        setQuestionModalTextError(mcqErrors.join(" | "));
        hasErr = true;
      }
    } else {
      if (!questionModalText.trim()) {
        setQuestionModalTextError("Question Text is mandatory.");
        hasErr = true;
      }
    }

    if (hasErr) return;

    let newQ = {
      id: questionModalEditIdx !== null ? flowWizRounds[flowWizSelectedRoundIdx].questions[questionModalEditIdx].id : Date.now(),
      type: questionModalType,
      difficulty: questionModalDifficulty,
      timeLimit: parseInt(questionModalTimeLimit),
      required: questionModalRequired,
      hints: questionModalHints.trim()
    };

    if (questionModalType === 'MCQ') {
      newQ.question = `MCQ Group (${mcqList.length} Questions)`;
      newQ.mcqs = mcqList.map(m => ({
        ...m,
        marks: parseInt(m.marks) || 5
      }));
      newQ.marks = mcqList.reduce((sum, m) => sum + (parseInt(m.marks) || 0), 0);
      newQ.answer = `Correct Answers: ${mcqList.map((m) => m.options[m.correctAnswer]?.label).join(', ')}`;
    } else {
      newQ.question = questionModalText.trim();
      newQ.answer = questionModalAnswer.trim();
      newQ.marks = parseInt(questionModalMarks) || 10;
    }

    const updatedRounds = [...flowWizRounds];
    if (!updatedRounds[flowWizSelectedRoundIdx].questions) {
      updatedRounds[flowWizSelectedRoundIdx].questions = [];
    }

    if (questionModalEditIdx !== null) {
      updatedRounds[flowWizSelectedRoundIdx].questions[questionModalEditIdx] = newQ;
      triggerToast("Question updated successfully.");
    } else {
      updatedRounds[flowWizSelectedRoundIdx].questions.push(newQ);
      triggerToast("Question added successfully.");
    }

    setFlowWizRounds(updatedRounds);
    setQuestionModalOpen(false);
  };

  const handleWizDeleteQuestion = (qIdx) => {
    const updatedRounds = [...flowWizRounds];
    updatedRounds[flowWizSelectedRoundIdx].questions.splice(qIdx, 1);
    setFlowWizRounds(updatedRounds);
    triggerToast("Question removed.");
  };

  // --- MCQ UTILITY HANDLERS ---
  const handleAddMcqOption = (mcqId) => {
    setMcqList(prev => prev.map(m => {
      if (m.id === mcqId) {
        const nextLabel = String.fromCharCode(65 + m.options.length);
        return {
          ...m,
          options: [...m.options, { label: nextLabel, text: '' }]
        };
      }
      return m;
    }));
  };

  const handleDeleteMcqOption = (mcqId, optIdx) => {
    setMcqList(prev => prev.map(m => {
      if (m.id === mcqId) {
        const updatedOpts = m.options.filter((_, idx) => idx !== optIdx);
        let nextCorrect = m.correctAnswer;
        if (m.correctAnswer === optIdx) {
          nextCorrect = null;
        } else if (m.correctAnswer > optIdx) {
          nextCorrect = m.correctAnswer - 1;
        }
        const relabeledOpts = updatedOpts.map((opt, idx) => ({
          ...opt,
          label: String.fromCharCode(65 + idx)
        }));
        return {
          ...m,
          options: relabeledOpts,
          correctAnswer: nextCorrect
        };
      }
      return m;
    }));
  };

  const handleUpdateMcqOptionText = (mcqId, optIdx, text) => {
    setMcqList(prev => prev.map(m => {
      if (m.id === mcqId) {
        const updatedOpts = m.options.map((opt, idx) => 
          idx === optIdx ? { ...opt, text } : opt
        );
        return { ...m, options: updatedOpts };
      }
      return m;
    }));
  };

  const handleUpdateMcqField = (mcqId, field, value) => {
    setMcqList(prev => prev.map(m => {
      if (m.id === mcqId) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const handleAddMcqCard = () => {
    const newMcq = {
      id: Date.now() + Math.random(),
      question: '',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ],
      correctAnswer: null,
      marks: 5,
      difficulty: 'Medium'
    };
    setMcqList(prev => [...prev, newMcq]);
  };

  const handleDeleteMcqCard = (mcqId) => {
    setMcqList(prev => prev.filter(m => m.id !== mcqId));
    setMcqCollapsedStates(prev => {
      const copy = { ...prev };
      delete copy[mcqId];
      return copy;
    });
  };

  const hasUnsavedChanges = () => {
    if (!flowWizOriginalData) return false;
    
    // Compare basic fields
    if ((flowWizName || '').trim() !== (flowWizOriginalData.name || '').trim()) return true;
    if ((flowWizTitle || '').trim() !== (flowWizOriginalData.jobTitle || '').trim()) return true;
    if ((flowWizDept || '').trim() !== (flowWizOriginalData.department || '').trim()) return true;
    if ((flowWizDesc || '').trim() !== (flowWizOriginalData.description || '').trim()) return true;
    if (flowWizModel !== (flowWizOriginalData.ai_model || 'sonnet')) return true;

    // Compare rounds and questions
    const currentRoundsJSON = JSON.stringify(flowWizRounds);
    const originalRoundsJSON = JSON.stringify(flowWizOriginalData.rounds || []);
    if (currentRoundsJSON !== originalRoundsJSON) return true;

    return false;
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges()) {
      setConfirmUnsavedOpen(true);
    } else {
      setFlowWizOpen(false);
    }
  };

  const handleConfirmSave = () => {
    setConfirmUnsavedOpen(false);
    // Submit with publish set to true if it was published, otherwise keep status
    const isLive = flowWizEditingId !== null ? templates.find(t => t.id === flowWizEditingId)?.is_live : false;
    handleSaveFlowWizard(isLive);
  };

  const handleConfirmDiscard = () => {
    setConfirmUnsavedOpen(false);
    setFlowWizOpen(false);
  };

  const handleSaveFlowWizard = (publish) => {
    if (!(flowWizName || '').trim()) {
      triggerToast("Flow Name is required.");
      return;
    }
    
    let hasQuestions = false;
    for (let r of flowWizRounds) {
      if (r.questions && r.questions.length > 0) {
        hasQuestions = true;
        break;
      }
    }
    if (!hasQuestions) {
      triggerToast("Please add at least one question to the flow.");
      return;
    }

    if (flowWizEditingId !== null) {
      const payload = {
        name: (flowWizName || '').trim(),
        jobTitle: (flowWizTitle || '').trim(),
        department: (flowWizDept || '').trim(),
        description: (flowWizDesc || '').trim(),
        version: flowWizVersion,
        is_live: publish,
        ai_model: flowWizModel,
        rounds: flowWizRounds
      };
      flowService.updateFlow(flowWizEditingId, payload).then(updatedFlow => {
        setTemplates(templates.map(t => t.id === flowWizEditingId ? updatedFlow : t));
        setFlowWizOriginalData(JSON.parse(JSON.stringify(updatedFlow)));
        setFlowWizOpen(false);
        triggerToast(`Flow "${flowWizName}" updated successfully.`);
      });
    } else {
      const payload = {
        name: (flowWizName || '').trim(),
        jobTitle: (flowWizTitle || '').trim() || "Generic Role",
        department: (flowWizDept || '').trim() || "General",
        description: (flowWizDesc || '').trim() || "No description provided.",
        rounds: flowWizRounds,
        is_live: publish,
        ai_model: flowWizModel
      };
      flowService.createFlow(payload).then(newFlow => {
        setTemplates([...templates, newFlow]);
        if (wizOpen && publish) {
          setWizAttachedFlowId(newFlow.id);
        }
        setFlowWizOriginalData(JSON.parse(JSON.stringify(newFlow)));
        setFlowWizOpen(false);
        triggerToast(`Flow "${newFlow.name}" created successfully as ${publish ? "Published" : "Draft"}.`);
      });
    }
    
    setFlowWizOpen(false);
  };

  // --- SCORECARD BUILDER HANDLERS ---
  const handleAddCriteriaWiz = () => {
    if (!newCritName.trim()) {
      triggerToast("Criteria name is required.");
      return;
    }
    const newCrit = {
      name: newCritName.trim(),
      maxMarks: parseInt(newCritMax) || 10,
      weight: parseInt(newCritWeight) || 0,
      mandatory: newCritMandatory
    };
    setScardWizCriteria([...scardWizCriteria, newCrit]);
    setNewCritName('');
  };

  const handleRemoveCriteriaWiz = (idx) => {
    setScardWizCriteria(scardWizCriteria.filter((_, i) => i !== idx));
  };

  const updateCriteriaName = (idx, value) => {
    setScardWizCriteria(scardWizCriteria.map((c, i) => i === idx ? { ...c, name: value } : c));
  };

  const updateCriteriaWeight = (idx, value) => {
    setScardWizCriteria(scardWizCriteria.map((c, i) => i === idx ? { ...c, weight: value } : c));
  };

  const updateCriteriaMandatory = (idx, value) => {
    setScardWizCriteria(scardWizCriteria.map((c, i) => i === idx ? { ...c, mandatory: value } : c));
  };

  const updateCriteriaMaxMarks = (idx, value) => {
    setScardWizCriteria(scardWizCriteria.map((c, i) => i === idx ? { ...c, maxMarks: value } : c));
  };

  const updateCriteriaDesc = (idx, value) => {
    setScardWizCriteria(scardWizCriteria.map((c, i) => i === idx ? { ...c, description: value } : c));
  };


  const handleAddDefaultParam = () => {
    setScardWizCriteria([
      ...scardWizCriteria,
      { name: `New Parameter ${scardWizCriteria.length + 1}`, maxMarks: 10, weight: 0, mandatory: false, description: '' }
    ]);
  };

  const handleSaveScorecardWiz = (publish) => {
    if (!scardWizName.trim()) {
      triggerToast("Scorecard Name is required.");
      return;
    }
    if (scardWizCriteria.length === 0) {
      triggerToast("Add at least one criteria parameter.");
      return;
    }

    const totalWeight = scardWizCriteria.reduce((sum, c) => sum + c.weight, 0);
    if (publish && totalWeight !== 100) {
      triggerToast(`Weights must total exactly 100% to publish! Current total: ${totalWeight}%`);
      return;
    }

    const payload = {
      name: scardWizName.trim(),
      jobTitle: scardWizTitle.trim() || "Generic Role",
      department: scardWizDept.trim() || "General",
      description: scardWizDesc.trim() || "Standard scorecard.",
      is_live: publish,
      criteria: scardWizCriteria,
      auto_reject_threshold: scardWizAutoRejectThreshold,
      rating_scale: scardWizRatingScale,
      hard_gate_param: scardWizHardGateParam
    };

    if (scardWizEditingId !== null) {
      scorecardService.updateScorecard(scardWizEditingId, payload).then(updatedScard => {
        setScorecards(scorecards.map(s => s.id === scardWizEditingId ? updatedScard : s));
        setScardWizOpen(false);
        triggerToast(`Scorecard "${updatedScard.name}" updated successfully.`);
      });
    } else {
      scorecardService.createScorecard(payload).then(newScard => {
        setScorecards([...scorecards, newScard]);
        setScardWizOpen(false);
        if (wizOpen && publish) {
          setWizAttachedScorecardId(newScard.id);
        }
        triggerToast(`Scorecard "${newScard.name}" saved successfully as ${publish ? "Published" : "Draft"}.`);
      });
    }
  };

  const handleEditAndAttachFlow = (op) => {
    setWizEditingJobId(op.id);
    setWizTitle(op.title || '');
    setWizDesc(op.description || '');
    setWizDept(op.department || 'General');
    setWizLocation(op.location || '');
    setWizSalary(op.salary || '');
    setWizHiringManager(op.hiring_manager || '');
    setWizType(op.employment_type || 'Full-time');
    setWizExp(op.experience || 'Fresher');
    setWizDefaultDuration(op.duration ? `${op.duration} Minutes` : '60 Minutes');
    setWizAttachedFlowId(op.interview_flow_id || null);
    setWizAttachedScorecardId(op.scorecard_id || null);
    
    setWizSearchFlowOpen(false);
    setWizSearchScorecardOpen(false);
    setWizStep(1);
    setWizOpen(true);
  };

  const handleMenuEditJobDetails = (op) => {
    handleEditAndAttachFlow(op);
    setWizStep(1);
    setOpenCardMenuId(null);
  };

  const handleMenuEditInterviewFlow = (op) => {
    handleEditAndAttachFlow(op);
    setWizStep(2);
    setOpenCardMenuId(null);
  };

  const handleMenuEditScorecard = (op) => {
    handleEditAndAttachFlow(op);
    setWizStep(3);
    setOpenCardMenuId(null);
  };

  const handleMenuPauseHiring = (op) => {
    const nextStatus = op.status === 'Paused' ? 'Live' : 'Paused';
    openingService.updateOpening(op.id, { status: nextStatus }).then(() => {
      const newList = openings.map(o => o.id === op.id ? { ...o, status: nextStatus } : o);
      setOpenings(newList);
      triggerToast(`Job "${op.title}" is now ${nextStatus === 'Paused' ? 'Paused' : 'Live'}.`);
    });
    setOpenCardMenuId(null);
  };

  const handleMenuCloseJob = (op) => {
    openingService.updateOpening(op.id, { status: 'Closed' }).then(() => {
      const newList = openings.map(o => o.id === op.id ? { ...o, status: 'Closed' } : o);
      setOpenings(newList);
      triggerToast(`Job "${op.title}" has been Closed.`);
    });
    setOpenCardMenuId(null);
  };

  const handleMenuDuplicateJob = (op) => {
    const payload = {
      title: `${op.title} (Copy)`,
      status: 'Draft',
      flow: op.flow || op.interview_flow_id || null,
      scorecard: op.scorecard || op.scorecard_id || null,
      description: op.description || '',
      department: op.department || 'General',
      employment_type: op.employment_type || 'Full-time',
      experience: op.experience || 'Entry level',
      location: op.location || 'Remote',
      salary: op.salary || 'Not specified',
      hiring_manager: op.hiring_manager || '',
      invited: 0,
      completed: 0,
      shortlisted: 0
    };
    openingService.createOpening(payload).then(newOp => {
      const mapped = {
        ...newOp,
        interview_flow_id: newOp.flow !== undefined ? newOp.flow : newOp.interview_flow_id,
        scorecard_id: newOp.scorecard !== undefined ? newOp.scorecard : newOp.scorecard_id
      };
      setOpenings([...openings, mapped]);
      triggerToast(`Job "${mapped.title}" duplicated successfully as Draft.`);
    });
    setOpenCardMenuId(null);
  };

  const handleMenuViewAnalytics = (op) => {
    setScreen('pipeline');
    setOpenCardMenuId(null);
  };

  const handleMenuArchiveJob = (op) => {
    const nextStatus = op.status === 'Archived' ? 'Draft' : 'Archived';
    openingService.updateOpening(op.id, { status: nextStatus }).then(() => {
      const newList = openings.map(o => o.id === op.id ? { ...o, status: nextStatus } : o);
      setOpenings(newList);
      triggerToast(`Job "${op.title}" has been ${nextStatus === 'Archived' ? 'Archived' : 'restored to Draft'}.`);
    });
    setOpenCardMenuId(null);
  };

  const handleMenuDeleteJob = (op) => {
    setDeleteJobConfirmOp(op);
    setOpenCardMenuId(null);
  };

  const handleMenuEditFlow = (t) => {
    setFlowWizEditingId(t.id);
    setFlowWizRounds(JSON.parse(JSON.stringify(t.rounds || []))); 
    setFlowWizName(t.name); 
    setFlowWizTitle(t.jobTitle); 
    setFlowWizDept(t.department); 
    setFlowWizDesc(t.description); 
    setFlowWizVersion(t.version); 
    setFlowWizTab('rounds');
    setFlowWizModel(t.ai_model || 'sonnet');
    setFlowWizStep(2);
    setFlowWizOriginalData(JSON.parse(JSON.stringify(t)));
    setFlowWizOpen(true);
    setOpenFlowMenuId(null);
  };

  const handleMenuDuplicateFlow = (t) => {
    const payload = {
      name: `${t.name} (Copy)`,
      jobTitle: t.jobTitle,
      department: t.department,
      description: t.description || 'No description provided.',
      version: t.version || 'v1',
      is_live: false,
      ai_model: t.ai_model || 'sonnet',
      rounds: JSON.parse(JSON.stringify(t.rounds || []))
    };
    flowService.createFlow(payload).then(newFlow => {
      setTemplates([...templates, newFlow]);
      triggerToast(`Flow "${newFlow.name}" duplicated successfully.`);
    });
    setOpenFlowMenuId(null);
  };

  const handleMenuViewQuestions = (t) => {
    setActiveFlowId(t.id);
    setFlowTab('questions');
    setTimeout(() => {
      const el = document.getElementById('flowTabs');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setOpenFlowMenuId(null);
  };

  const handleMenuDeleteFlow = (t) => {
    setDeleteFlowConfirmOp(t);
    setOpenFlowMenuId(null);
  };

  const handleMenuEditScorecardTemplate = (s) => {
    setScardWizEditingId(s.id);
    setScardWizName(s.name || '');
    setScardWizTitle(s.jobTitle || '');
    setScardWizDept(s.department || '');
    setScardWizDesc(s.description || '');
    setScardWizAutoRejectThreshold(s.auto_reject_threshold || 50);
    setScardWizRatingScale(s.rating_scale || '1-10');
    setScardWizHardGateParam(s.hard_gate_param || 'Technical Skills');
    setScardWizCriteria(JSON.parse(JSON.stringify(s.criteria || [])));
    setScardWizOpen(true);
    setOpenScorecardMenuId(null);
  };

  const handleMenuDuplicateScorecardTemplate = (s) => {
    const payload = {
      name: `${s.name} (Copy)`,
      jobTitle: s.jobTitle,
      department: s.department,
      description: s.description || 'Standard scorecard.',
      is_live: false,
      criteria: JSON.parse(JSON.stringify(s.criteria || [])),
      auto_reject_threshold: s.auto_reject_threshold,
      rating_scale: s.rating_scale,
      hard_gate_param: s.hard_gate_param
    };
    scorecardService.createScorecard(payload).then(newScard => {
      setScorecards([...scorecards, newScard]);
      triggerToast(`Scorecard "${newScard.name}" duplicated successfully.`);
    });
    setOpenScorecardMenuId(null);
  };

  const handleMenuDeleteScorecardTemplate = (s) => {
    setDeleteScorecardConfirmOp(s);
    setOpenScorecardMenuId(null);
  };

  // --- JOB CREATION WIZARD MAIN HANDLER ---
  const handleJobWizardGo = (dir) => {
    if (wizStep === 4 && dir === 1) {
      if (!wizAttachedFlowId || !wizAttachedScorecardId) {
        triggerToast("Published Jobs MUST have an Interview Flow and a Scorecard attached. Save as Draft or select templates.");
        return;
      }
      
      const payload = {
        title: wizTitle || "New Role",
        description: wizDesc,
        department: wizDept || "General",
        employment_type: wizType,
        experience: wizExp,
        location: wizLocation,
        salary: wizSalary,
        hiring_manager: wizHiringManager,
        status: "Live",
        flow: wizAttachedFlowId,
        scorecard: wizAttachedScorecardId
      };

      if (wizEditingJobId !== null) {
        openingService.updateOpening(wizEditingJobId, payload).then(updatedJob => {
          const mapped = {
            ...updatedJob,
            interview_flow_id: updatedJob.flow !== undefined ? updatedJob.flow : updatedJob.interview_flow_id,
            scorecard_id: updatedJob.scorecard !== undefined ? updatedJob.scorecard : updatedJob.scorecard_id
          };
          setOpenings(openings.map(o => o.id === wizEditingJobId ? mapped : o));
          setWizOpen(false);
          setScreen('openings');
          triggerToast(`Job "${mapped.title}" published successfully!`);
        });
      } else {
        openingService.createOpening(payload).then(newJob => {
          const mapped = {
            ...newJob,
            interview_flow_id: newJob.flow !== undefined ? newJob.flow : newJob.interview_flow_id,
            scorecard_id: newJob.scorecard !== undefined ? newJob.scorecard : newJob.scorecard_id
          };
          setOpenings([...openings, mapped]);
          setWizOpen(false);
          setScreen('openings');
          triggerToast(`Job "${mapped.title}" published successfully!`);
        });
      }
    } else {
      setWizStep(Math.min(4, Math.max(1, wizStep + dir)));
    }
  };

  const handleCreateJobAsDraft = () => {
    const payload = {
      title: wizTitle || "New Draft Role",
      description: wizDesc,
      department: wizDept || "General",
      employment_type: wizType,
      experience: wizExp,
      location: wizLocation,
      salary: wizSalary,
      hiring_manager: wizHiringManager,
      status: "Draft",
      flow: wizAttachedFlowId,
      scorecard: wizAttachedScorecardId
    };

    if (wizEditingJobId !== null) {
      openingService.updateOpening(wizEditingJobId, payload).then(updatedJob => {
        const mapped = {
          ...updatedJob,
          interview_flow_id: updatedJob.flow !== undefined ? updatedJob.flow : updatedJob.interview_flow_id,
          scorecard_id: updatedJob.scorecard !== undefined ? updatedJob.scorecard : updatedJob.scorecard_id
        };
        setOpenings(openings.map(o => o.id === wizEditingJobId ? mapped : o));
        setWizOpen(false);
        setScreen('openings');
        triggerToast(`Job "${mapped.title}" saved as Draft.`);
      });
    } else {
      openingService.createOpening(payload).then(newJob => {
        const mapped = {
          ...newJob,
          interview_flow_id: newJob.flow !== undefined ? newJob.flow : newJob.interview_flow_id,
          scorecard_id: newJob.scorecard !== undefined ? newJob.scorecard : newJob.scorecard_id
        };
        setOpenings([...openings, mapped]);
        setWizOpen(false);
        setScreen('openings');
        triggerToast(`Job "${mapped.title}" saved as Draft.`);
      });
    }
  };

  const handleAddQuestionToActiveFlow = () => {
    if (!newQuestionType) {
      triggerToast("Please select a Question Type.");
      return;
    }
    if (!newQuestionText.trim() || !newQuestionRub.trim()) {
      triggerToast("Fill in both the Question and the expected answer.");
      return;
    }
    if (!newQuestionTimeLimit || parseInt(newQuestionTimeLimit) <= 0) {
      triggerToast("Time limit is mandatory.");
      return;
    }

    const updatedTemplates = templates.map(t => {
      if (t.id === activeFlowId) {
        const roundsCopy = JSON.parse(JSON.stringify(t.rounds || []));
        if (!roundsCopy[selectedWizRoundIdx]) {
          roundsCopy[selectedWizRoundIdx] = { type: 'tech', name: 'Technical Round', questions: [] };
        }
        roundsCopy[selectedWizRoundIdx].questions.push({
          id: Date.now(),
          question: newQuestionText.trim(),
          type: newQuestionType,
          answer: newQuestionRub.trim(),
          timeLimit: parseInt(newQuestionTimeLimit),
          difficulty: "Medium",
          required: true
        });
        
        // Save to backend
        flowService.updateFlow(t.id, { rounds: roundsCopy }).catch(err => {
          console.error(err);
          triggerToast("Failed to save question to server.");
        });
        
        return { ...t, rounds: roundsCopy };
      }
      return t;
    });

    setTemplates(updatedTemplates);
    setNewQuestionText('');
    setNewQuestionRub('');
    setNewQuestionType('');
    triggerToast("Question added to flow round.");
  };

  const handleToggleActiveQuestionRequired = (rIdx, qIdx) => {
    const updated = templates.map(t => {
      if (t.id === activeFlowId) {
        const roundsCopy = JSON.parse(JSON.stringify(t.rounds || []));
        roundsCopy[rIdx].questions[qIdx].required = !roundsCopy[rIdx].questions[qIdx].required;
        
        // Save to backend
        flowService.updateFlow(t.id, { rounds: roundsCopy }).catch(err => {
          console.error(err);
          triggerToast("Failed to save changes to server.");
        });
        
        return { ...t, rounds: roundsCopy };
      }
      return t;
    });
    setTemplates(updated);
  };

  const handleRemoveActiveQuestion = (rIdx, qIdx) => {
    const updated = templates.map(t => {
      if (t.id === activeFlowId) {
        const roundsCopy = JSON.parse(JSON.stringify(t.rounds || []));
        roundsCopy[rIdx].questions.splice(qIdx, 1);
        
        // Save to backend
        flowService.updateFlow(t.id, { rounds: roundsCopy }).catch(err => {
          console.error(err);
          triggerToast("Failed to save changes to server.");
        });
        
        return { ...t, rounds: roundsCopy };
      }
      return t;
    });
    setTemplates(updated);
    triggerToast("Question deleted.");
  };

  // Filtered Candidates list for Pipeline
  const activeOpening = openings.find(o => String(o.id) === String(selectedOpeningId)) || openings[0];
  const openingCandidates = candidates.filter(c => activeOpening ? String(c.opening) === String(activeOpening.id) : true);

  const totalInvited = openingCandidates.length;
  const totalStarted = openingCandidates.filter(c => c.status !== 'Invited').length;
  const totalCompleted = openingCandidates.filter(c => ['Scored', 'Shortlisted', 'Rejected (auto)', 'Rejected'].includes(c.status)).length;
  const totalCleared = openingCandidates.filter(c => ['Scored', 'Shortlisted'].includes(c.status) && (c.score === null || c.score >= 50)).length;
  const totalShortlisted = openingCandidates.filter(c => c.status === 'Shortlisted').length;

  const wInvited = totalInvited > 0 ? 100 : 0;
  const wStarted = totalInvited > 0 ? Math.round((totalStarted / totalInvited) * 100) : 0;
  const wCompleted = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * wStarted) : 0;
  const wCleared = totalCompleted > 0 ? Math.round((totalCleared / totalCompleted) * wCompleted) : 0;
  const wShortlisted = totalCleared > 0 ? Math.round((totalShortlisted / totalCleared) * wCleared) : 0;

  const filteredCandidates = openingCandidates.filter(c => {
    if (pipelineFilter === 'all') return true;
    if (pipelineFilter === 'progress') return c.status === 'In progress';
    return c.status.startsWith(pipelineFilter) || (pipelineFilter === 'Scored' && c.status === 'Shortlisted');
  });

  // --- Dashboard Analytics ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const interviewsThisMonth = candidates.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  
  const awaitingReview = candidates.filter(c => c.status === 'Scored').length;
  const latestScored = [...candidates]
    .filter(c => ['Scored', 'Shortlisted', 'Rejected'].includes(c.status))
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
    .slice(0, 4);
  
  const formattedToday = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  // Breadcrumbs rendering logic
  const renderCrumbs = () => {
    if (screen === 'dash') return "Dashboard";
    if (screen === 'openings') return "Job openings";
    if (screen === 'pipeline') {
      return (
        <>
          <a href="#openings" onClick={(e) => { e.preventDefault(); setScreen('openings'); }}>Openings</a>
          <span className="sep">/</span>{activeOpening ? activeOpening.title : 'Audit & Tax Executive'}
        </>
      );
    }
    if (screen === 'report') {
      return (
        <>
          <a href="#pipeline" onClick={(e) => { e.preventDefault(); setScreen('pipeline'); }}>Pipeline</a>
          <span className="sep">/</span>{candidateForReport ? candidateForReport.name : 'Candidate report'}
        </>
      );
    }
    if (screen === 'flow') return "Interview flows";
    if (screen === 'scorecard') return "Scorecards";
    if (screen === 'settings') return "Settings";
    if (screen === 'profile') return "My Profile";
    return "Dashboard";
  };

  const handleJumpToChapter = (idx) => {
    setActiveChapter(idx);
    const el = document.getElementById(`tr${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await mockClient.get('/api/interview-invitations/management/');
      setInvitations(res.data);
    } catch (e) {
      console.error("Failed to load invitations", e);
    }
  };

  useEffect(() => {
    if (screen === 'invitations') {
      fetchInvitations();
    }
  }, [screen]);

  const handleCancelInvitation = async (id) => {
    try {
      await mockClient.post(`/api/interview-invitations/management/${id}/cancel/`);
      triggerToast("Invitation cancelled successfully.");
      fetchInvitations();
    } catch (e) {
      triggerToast(e.message || "Failed to cancel invitation.");
    }
  };

  const handleResendInvitation = async (id) => {
    try {
      await mockClient.post(`/api/interview-invitations/management/${id}/resend/`);
      triggerToast("New invitation sent successfully.");
      fetchInvitations();
    } catch (e) {
      triggerToast(e.message || "Failed to resend invitation.");
    }
  };

  const handleCopyInviteLink = (token) => {
    const link = `${window.location.origin}/interview/invite/${token}`;
    navigator.clipboard.writeText(link);
    triggerToast("Interview link copied to clipboard!");
  };

  const candidateForReport = activeCandidate || candidates.find(c => c.st === 'Scored' || c.st === 'Shortlisted') || candidates[0];

  const handleStatusChange = async (newStatus) => {
    if (!candidateForReport) return;
    try {
      const updated = await candidateService.updateCandidate(candidateForReport.id, { status: newStatus });
      setCandidates(candidates.map(c => c.id === updated.id ? updated : c));
      triggerToast(`Candidate marked as ${newStatus}.`);
    } catch (e) {
      triggerToast("Failed to update candidate status.");
    }
  };

  const handleSavePartnerNote = async (text) => {
    if (!candidateForReport) return;
    try {
      const updated = await candidateService.updateCandidate(candidateForReport.id, {
        partner_note: text
      });
      setCandidates(candidates.map(c => c.id === candidateForReport.id ? updated : c));
      setActiveCandidate(updated);
      triggerToast("Partner note saved successfully.");
    } catch (err) {
      console.error("Failed to save note:", err);
      triggerToast("Error saving partner note.");
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0e2b26',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          border: '4px solid rgba(255, 255, 255, 0.1)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          borderLeftColor: '#f1a80a',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '16px', fontSize: '14px', letterSpacing: '0.05em' }}>Loading Hirelens Workspace...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleInviteCandidate = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      triggerToast("Name and email are required.");
      return;
    }
    setIsSendingInvite(true);
    try {
      const newCand = await candidateService.inviteCandidate(
        inviteName.trim(),
        inviteEmail.trim(),
        parseInt(inviteOpeningId),
        inviteExpiryHours
      );
      
      const opening = openings.find(o => o.id === parseInt(inviteOpeningId));
      
      // EmailJS integration
      const emailSettings = newCand.emailjs_settings;
      const serviceID = emailSettings ? emailSettings.service_id : 'YOUR_SERVICE_ID';
      const templateID = emailSettings ? emailSettings.template_id : 'YOUR_TEMPLATE_ID';
      const publicKey = emailSettings ? emailSettings.public_key : 'YOUR_PUBLIC_KEY';
      
      const loginLink = newCand.interview_token 
        ? `${window.location.origin}/candidate-portal/login?token=${newCand.interview_token}`
        : `${window.location.origin}/candidate-portal/login?student_id=${newCand.student_id || newCand.id}&email=${encodeURIComponent(newCand.email || '')}`;

      const emailParams = {
        to_name: inviteName.trim(),
        to_email: inviteEmail.trim(),
        job_title: opening ? opening.title : 'Interview',
        student_id: newCand.student_id || newCand.id,
        login_link: loginLink,
        // Add variables commonly used in the CA SaaS default templates
        company_name: (currentUser && currentUser.tenant_name) ? currentUser.tenant_name : 'NZ Solutions',
        firm_name: (currentUser && currentUser.tenant_name) ? currentUser.tenant_name : 'NZ Solutions',
        message: `You have been invited to an interview for the position of ${opening ? opening.title : 'Interview'}. \n\nPlease access your assessment directly using this secure link: ${loginLink} \n\nYour Student ID/Exam ID is: ${newCand.student_id || newCand.id}`
      };
      
      try {
        if (serviceID !== 'YOUR_SERVICE_ID') {
          await emailjs.send(serviceID, templateID, emailParams, publicKey);
        } else {
          console.log("EmailJS not configured. Would send:", emailParams);
        }
      } catch (emailErr) {
        console.error("Failed to send email via EmailJS:", emailErr);
      }
      
      setCandidates([...candidates, newCand]);
      
      setInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      triggerToast("Invitation sent successfully!");
    } catch (error) {
      console.error(error);
      triggerToast(error.message || "Failed to send invite.");
    } finally {
      setIsSendingInvite(false);
    }
  };



  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ================= LOGIN SCREEN ================= */}
      {!isLoggedIn && (
        <form onSubmit={handleSignIn} className="login" id="loginScreen" style={{ display: 'grid' }}>
          <div className="login-brandside">
            <div className="wordmark"><img src="/logo.jpg" alt="Logo" className="lens-logo" style={{ borderRadius: '50%', objectFit: 'cover' }} />Hirelens AI</div>
            <div className="login-hero">
              <h1>250 applications.<br />You interview <em>nine</em>.</h1>
              <p>Hirelens runs the screening interview for you — on camera, scored against your own criteria, asking only questions you've approved. You spend partner time only on people worth it.</p>
              <div className="login-stats">
                <div className="lstat"><b>92%</b><span>completion rate</span></div>
                <div className="lstat"><b>₹39</b><span>avg cost / interview</span></div>
                <div className="lstat"><b>11 hrs</b><span>saved per opening</span></div>
              </div>
            </div>
            <div className="big-aperture"></div>
          </div>
          <div className="login-formside">
            <div className="login-card">
              <h2>Sign in to your workspace</h2>
              <p className="sub">Kulkarni Mehta &amp; Associates · <span className="mono">kma.hirelens.in</span></p>
              <div className="lfield">
                <label>Work email</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="lfield">
                <label>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    required 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    {showLoginPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
              <div className="login-row">
                <label style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'var(--petrol)' }} /> Keep me signed in
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
              <button type="submit" className="btn primary" style={{ width: '100%' }}>Sign in →</button>
              <div className="orline">OR CONTINUE WITH</div>
              <div className="sso">
                <button type="button" className="btn ghost" onClick={handleSignIn}>Google</button>
                <button type="button" className="btn ghost" onClick={handleSignIn}>Microsoft</button>
              </div>
              <p className="trial">New to Hirelens? <a href="#trial" onClick={(e) => e.preventDefault()}>Start a 14-day trial</a> — no card needed.</p>
              <p className="trial" style={{ marginTop: '10px' }}>Are you a candidate? <a href="#candidate" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/candidate'); window.dispatchEvent(new Event('pathnamechange')); }}>Access your interview portal →</a></p>
            </div>
          </div>
        </form>
      )}

      {/* ================= MAIN APP WRAPPER ================= */}
      {isLoggedIn && (
        <div className="app on" id="app">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="side">
            <div className="wordmark"><img src="/logo.jpg" alt="Logo" className="lens-logo" style={{ borderRadius: '50%', objectFit: 'cover' }} />Hirelens AI</div>
            <ul className="nav">
              <li>
                <button className={screen === 'dash' ? 'on' : ''} onClick={() => showScreen('dash')}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
                  Dashboard
                </button>
              </li>
              <li>
                <button className={(screen === 'openings' || screen === 'pipeline' || screen === 'report') ? 'on' : ''} onClick={() => showScreen('openings')}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
                  Job openings
                </button>
              </li>

              <li className="navlabel">Configure</li>
              <li>
                <button className={screen === 'flow' ? 'on' : ''} onClick={() => { showScreen('flow'); setFlowTab('rounds'); }}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7 7.5L10.5 16M17 7.5L13.5 16" /></svg>
                  Interview flows
                </button>
              </li>
              <li>
                <button className={screen === 'scorecard' ? 'on' : ''} onClick={() => showScreen('scorecard')}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M4 20h4V10H4zM10 20h4V4h-4zM16 20h4v-7h-4z" /></svg>
                  Scorecards
                </button>
              </li>
              <li className="navlabel">Workspace</li>
              <li>
                <button className={screen === 'settings' ? 'on' : ''} onClick={() => showScreen('settings')}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h0a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55h0a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v0a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" /></svg>
                  Settings
                </button>
              </li>
              <li style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <button className="btn ghost" style={{ width: '100%', color: 'var(--rec)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', justifyContent: 'flex-start' }} onClick={() => handleSignOut()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', flexShrink: 0 }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Sign out
                </button>
              </li>
            </ul>
            <div className="side-user" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentUser && currentUser.profile_pic ? (
                  <img src={currentUser.profile_pic} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  currentUser ? `${currentUser.first_name[0]}${currentUser.last_name[0]}` : 'MK'
                )}
              </span>
              <span>
                <b>{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Meera Kulkarni'}</b>
                <span>{currentUser ? `${currentUser.role} · ${currentUser.tenant_name || 'Admin'}` : 'Managing Partner · Admin'}</span>
              </span>
              
              {userMenuOpen && (
                <div className="card pad" style={{
                  position: 'absolute',
                  bottom: '60px',
                  left: '10px',
                  width: '200px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 60,
                  backgroundColor: '#fff',
                  border: '1px solid #eee',
                  textAlign: 'left'
                }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>Logged in as</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>
                      {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Meera Kulkarni'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                      {currentUser ? currentUser.email : 'meera@kulkarni.co'}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                    Organization: <b>{currentUser ? currentUser.tenant_name : 'Kulkarni & Co.'}</b>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #eee', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button className="btn sm ghost" style={{ width: '100%', color: 'var(--petrol)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => {
                      setUserMenuOpen(false);
                      showScreen('profile');
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      My Profile
                    </button>
                    <button className="btn ghost sm" style={{ width: '100%', color: 'var(--rec)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
                      setUserMenuOpen(false);
                      handleSignOut();
                    }}>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="content">
            
            {/* TOP BAR */}
            <div className="topbar">
              <span className="crumb" id="crumb">{renderCrumbs()}</span>
              <span className="grow"></span>
              <span className="usage-pill">
                <b>182 / 250</b> interviews
                <span className="track"><span className="fill" style={{ width: '73%' }}></span></span>
                Growth plan
              </span>
              <button className="btn amber sm" onClick={() => setInviteModalOpen(true)}>+ Invite candidates</button>
            </div>

            {/* ========== VIEW: DASHBOARD ========== */}
            <section className={`view ${screen === 'dash' ? 'on' : ''}`} id="v-dash">
              <div className="vhead">
                <div>
                  <h2>{getTimeBasedGreeting()}, {currentUser ? currentUser.first_name : 'Meera'}</h2>
                  <p>{formattedToday} · {activeOpening ? activeOpening.title : 'Audit & Tax Executive'} screening is live</p>
                </div>
                <button className="btn ghost" onClick={() => setScreen('openings')}>All openings</button>
              </div>

              <div className="kpis">
                <div className="kpi">
                  <div className="lab">Interviews this month</div>
                  <div className="num">{interviewsThisMonth} <small>/ 250 plan</small></div>
                  <div className="delta">▲ Auto calculated</div>
                </div>
                <div className="kpi">
                  <div className="lab">Awaiting your review</div>
                  <div className="num">{awaitingReview}</div>
                  <div className="delta warn">{awaitingReview > 0 ? 'Pending action' : 'All caught up!'}</div>
                </div>
                <div className="kpi">
                  <div className="lab">Average Duration</div>
                  <div className="num">34 <small>mins</small></div>
                  <div className="delta ok">Auto calculated</div>
                </div>
                <div className="kpi">
                  <div className="lab">Avg AI cost / interview</div>
                  <div className="num">₹41</div>
                  <div className="delta">₹{interviewsThisMonth * 41} this month</div>
                </div>
              </div>

              <div className="dash-grid">
                <div className="card pad">
                  <div className="eyebrow">{activeOpening ? activeOpening.title : 'Audit & Tax Executive'} — this cycle</div>
                  <h2 style={{ fontSize: '18px', margin: '6px 0 14px' }}>From {totalInvited} applications to {totalShortlisted} shortlists</h2>
                  <div className="funnel">
                    <div className="f-row"><span className="fl">Invited</span><span className="fb"><i style={{ width: `${wInvited}%` }}></i></span><span className="fn">{totalInvited}</span></div>
                    <div className="f-row"><span className="fl">Started</span><span className="fb"><i style={{ width: `${wStarted}%` }}></i></span><span className="fn">{totalStarted}</span></div>
                    <div className="f-row"><span className="fl">Completed</span><span className="fb"><i style={{ width: `${wCompleted}%` }}></i></span><span className="fn">{totalCompleted}</span></div>
                    <div className="f-row"><span className="fl">Cleared threshold</span><span className="fb"><i style={{ width: `${wCleared}%` }}></i></span><span className="fn">{totalCleared}</span></div>
                    <div className="f-row"><span className="fl">Shortlisted</span><span className="fb"><i style={{ width: `${wShortlisted}%` }}></i></span><span className="fn">{totalShortlisted}</span></div>
                  </div>
                  <p className="f-note">Rounds replaced by Hirelens: application form, HR round, first technical screen. <b>Est. 11 hrs of partner &amp; HR time saved</b> this cycle.</p>
                </div>

                <div className="card pad">
                  <div className="eyebrow">Latest scored</div>
                  <div className="rlist" style={{ marginTop: '8px' }}>
                    {latestScored.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>No candidates scored yet.</p>
                    ) : latestScored.map((c, idx) => {
                      const ini = c.name ? c.name.split(" ").map(x => x[0]).join("") : "??";
                      let totalScore = 100;
                      try {
                        if (c.meta_info) {
                          const meta = typeof c.meta_info === 'string' ? JSON.parse(c.meta_info) : c.meta_info;
                          if (meta.total_score) totalScore = meta.total_score;
                        }
                      } catch(e) {}
                      const pct = c.score !== null ? (c.score / totalScore) * 100 : 0;
                      const scoreClass = pct >= 71 ? "s-hi" : pct >= 51 ? "s-mid" : "s-lo";
                      return (
                        <div className="r-item" key={idx}>
                          <span className="mini-av">{ini}</span>
                          <span className="grow">
                            <b>{c.name}</b>
                            <small>{c.status === 'In progress' ? 'In progress' : `Completed ${formatLocalTime(c.completed_at)}`} · {c.tab_switches ? `⚑ ${c.tab_switches} tab switches` : '34 min'}</small>
                          </span>
                          <span className={`scorechip ${scoreClass}`}>{c.score !== null ? `${c.score}/${totalScore}` : '—'}</span>
                          <button className="linkbtn" onClick={() => { setActiveCandidate(c); setScreen('report'); }}>
                            Report
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '14px' }}>
                    <button className="btn ghost sm" onClick={() => setScreen('pipeline')}>Open full pipeline →</button>
                  </div>
                </div>
              </div>
            </section>

            {/* ========== VIEW: OPENINGS ========== */}
            <section className={`view ${screen === 'openings' ? 'on' : ''}`} id="v-openings">
              <div className="vhead">
                <div>
                  <h2>Job openings</h2>
                  <p>Each opening carries its own interview flow, scorecard and pipeline.</p>
                </div>
                <button className="btn primary" onClick={() => { 
                  setWizEditingJobId(null);
                  setWizTitle('Senior Backend Developer');
                  setWizDesc('Responsible for microservices design, REST API endpoints, and SQL queries.');
                  setWizDept('Engineering');
                  setWizLocation('Pune, hybrid');
                  setWizSalary('₹8.0 - ₹12.0 LPA');
                  setWizHiringManager('Jay Sir');
                  setWizType('Full-time');
                  setWizExp('2–5 years');
                  setWizDefaultDuration('60 Minutes');
                  setWizAttachedFlowId(null);
                  setWizAttachedScorecardId(null);
                  setWizSearchFlowOpen(false);
                  setWizSearchScorecardOpen(false);
                  setWizStep(1); 
                  setWizOpen(true); 
                }}>+ New opening</button>
              </div>

              <div className="op-grid" id="opGrid">
                {openings.map(op => {
                  const flow = templates.find(t => t.id === op.interview_flow_id);
                  const scorecard = scorecards.find(s => s.id === op.scorecard_id);
                  const duration = flow ? getFlowCalculatedDuration(flow) : 0;
                  
                  return (
                    <div className="op-card" key={op.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge ${op.status === 'Live' ? 'b-ok' : op.status === 'Draft' ? 'b-amber' : op.status === 'Paused' ? 'b-amber' : 'b-mute'}`}>
                            {op.status === 'Live' ? '● Live' : op.status === 'Draft' ? '◐ Draft' : op.status === 'Paused' ? '⏸ Paused' : op.status}
                          </span>
                          <span className="badge b-mute">
                            {!flow && !scorecard ? 'Flow & Scorecard not attached' : !flow ? 'Flow not attached' : !scorecard ? 'Scorecard not attached' : flow.name}
                          </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="btn ghost" 
                            style={{ 
                              padding: '2px 8px', 
                              minWidth: 'auto', 
                              border: 'none', 
                              background: 'transparent', 
                              fontSize: '18px', 
                              fontWeight: 'bold', 
                              color: 'var(--muted)',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCardMenuId(openCardMenuId === op.id ? null : op.id);
                            }}
                          >
                            ⋮
                          </button>
                          {openCardMenuId === op.id && (
                            <div className="card" style={{
                              position: 'absolute',
                              right: 0,
                              top: '28px',
                              width: '180px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              zIndex: 50,
                              backgroundColor: '#fff',
                              border: '1px solid var(--line)',
                              borderRadius: '10px',
                              padding: '6px 0',
                              display: 'flex',
                              flexDirection: 'column'
                            }} onClick={(e) => e.stopPropagation()}>
                              <button className="menu-item-btn" onClick={() => handleMenuEditJobDetails(op)}>Edit Job Details</button>
                              <button className="menu-item-btn" onClick={() => handleMenuEditInterviewFlow(op)}>Edit Interview Flow</button>
                              <button className="menu-item-btn" onClick={() => handleMenuEditScorecard(op)}>Edit Scorecard</button>
                              <button className="menu-item-btn" onClick={() => handleMenuPauseHiring(op)}>{op.status === 'Paused' ? 'Resume Hiring' : 'Pause Hiring'}</button>
                              <button className="menu-item-btn" onClick={() => handleMenuCloseJob(op)}>Close Job</button>
                              <button className="menu-item-btn" onClick={() => handleMenuDuplicateJob(op)}>Duplicate Job</button>
                              <button className="menu-item-btn" onClick={() => handleMenuViewAnalytics(op)}>View Analytics</button>
                              <button className="menu-item-btn" onClick={() => handleMenuArchiveJob(op)}>{op.status === 'Archived' ? 'Unarchive Job' : 'Archive Job'}</button>
                              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                              <button className="menu-item-btn" style={{ color: 'var(--rec)' }} onClick={() => handleMenuDeleteJob(op)}>Delete Job</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <h3>{op.title}</h3>
                      <p className="op-meta" style={{ margin: '4px 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                        Department: <b>{op.department}</b> · Manager: <b>{op.hiring_manager || "—"}</b>
                      </p>
                      <p className="op-meta">{op.meta} · <b>{duration ? `${duration} min duration` : 'No duration'}</b></p>
                      <div className="op-stats" style={{ margin: '14px 0' }}>
                        <span className="op-stat"><b>{candidates.filter(c => String(c.opening) === String(op.id)).length}</b><span>INVITED</span></span>
                        <span className="op-stat"><b>{candidates.filter(c => String(c.opening) === String(op.id) && ['Scored', 'Shortlisted', 'Rejected', 'Rejected (auto)'].includes(c.st)).length}</b><span>DONE</span></span>
                        <span className="op-stat"><b>{candidates.filter(c => String(c.opening) === String(op.id) && c.st === 'Shortlisted').length}</b><span>SHORTLIST</span></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn ghost sm" onClick={() => {
                          setSelectedOpeningId(op.id);
                          setScreen('pipeline');
                        }}>
                          Open pipeline
                        </button>
                        {op.status === 'Draft' && (!op.interview_flow_id || !op.scorecard_id) ? (
                          <button className="btn primary sm" onClick={() => handleEditAndAttachFlow(op)}>
                            Edit &amp; Attach Flow
                          </button>
                        ) : op.status === 'Draft' ? (
                          <button className="btn primary sm" onClick={() => {
                            const updated = openings.map(o => o.id === op.id ? { ...o, status: 'Live' } : o);
                            setOpenings(updated);
                            triggerToast(`Job "${op.title}" is now Live!`);
                          }}>
                            Publish job
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ========== VIEW: PIPELINE ========== */}
            <section className={`view ${screen === 'pipeline' ? 'on' : ''}`} id="v-pipeline">
              <div className="vhead">
                <div>
                  <h2>{activeOpening ? activeOpening.title : 'Audit & Tax Executive'} · Pipeline</h2>
                  <p>{openingCandidates.filter(c => c.st !== 'Invited').length} of {openingCandidates.length} invited candidates have started. Auto-reject threshold: overall &lt; 50.</p>
                </div>
                <div style={{ display: 'flex', gap: '9px' }}>
                  <button className="btn ghost" onClick={() => triggerToast('Exports CSV of the filtered view.')}>Export CSV</button>
                  <button className="btn primary" onClick={() => setInviteModalOpen(true)}>+ Invite candidates</button>
                </div>
              </div>

              <div className="filters" id="pipeFilters">
                <button className={`fchip ${pipelineFilter === 'all' ? 'on' : ''}`} onClick={() => setPipelineFilter('all')}>All · {openingCandidates.length}</button>
                <button className={`fchip ${pipelineFilter === 'Scored' ? 'on' : ''}`} onClick={() => setPipelineFilter('Scored')}>Scored · {openingCandidates.filter(c => c.sc !== null).length}</button>
                <button className={`fchip ${pipelineFilter === 'Shortlisted' ? 'on' : ''}`} onClick={() => setPipelineFilter('Shortlisted')}>Shortlisted · {openingCandidates.filter(c => c.st === 'Shortlisted').length}</button>
                <button className={`fchip ${pipelineFilter === 'progress' ? 'on' : ''}`} onClick={() => setPipelineFilter('progress')}>In progress · {openingCandidates.filter(c => c.st === 'In progress').length}</button>
                <button className={`fchip ${pipelineFilter === 'Invited' ? 'on' : ''}`} onClick={() => setPipelineFilter('Invited')}>Invited · {openingCandidates.filter(c => c.st === 'Invited').length}</button>
                <button className={`fchip ${pipelineFilter === 'Rejected' ? 'on' : ''}`} onClick={() => setPipelineFilter('Rejected')}>Rejected · {openingCandidates.filter(c => c.st.startsWith('Rejected')).length}</button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Integrity</th>
                      <th>Completed</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c, idx) => {
                      const ini = c.name ? c.name.split(" ").map(x => x[0]).join("") : "??";
                      let totalScore = 100;
                        try {
                          if (c.meta_info) {
                            const meta = typeof c.meta_info === 'string' ? JSON.parse(c.meta_info) : c.meta_info;
                            if (meta.total_score) totalScore = meta.total_score;
                          }
                        } catch(e) {}
                        const pct = c.score !== null ? (c.score / totalScore) * 100 : 0;
                        const scoreClass = c.score === null ? "" : pct >= 71 ? "s-hi" : pct >= 51 ? "s-mid" : "s-lo";
                      return (
                        <tr key={idx}>
                          <td>
                            <span className="tname">
                              <span className="mini-av">{ini}</span>{c.name}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'Shortlisted' ? 'b-ok' : c.status === 'Scored' ? 'b-info' : c.status === 'In progress' ? 'b-amber' : c.status === 'Invited' ? 'b-mute' : 'b-rec'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            {c.score !== null ? <span className={`scorechip ${scoreClass}`}>{`${c.score}/${totalScore}`}</span> : <span className="okcell">—</span>}
                          </td>
                          <td>
                            {c.tab_switches ? <span className="flagcell">⚑ {c.tab_switches} tab switch{c.tab_switches > 1 ? 'es' : ''}</span> : <span className="okcell">Clean</span>}
                          </td>
                          <td className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>{formatLocalTime(c.completed_at)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {c.score !== null ? (
                              <button className="btn ghost sm" onClick={() => { setActiveCandidate(c); setScreen('report'); }}>
                                View report
                              </button>
                            ) : (
                              <button className="btn ghost sm" onClick={() => triggerToast('Reminder email queued.')}>Remind</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="tfoot">Showing {filteredCandidates.length} candidates · sorted by score</div>
              </div>
            </section>

            {/* ========== VIEW: CANDIDATE REPORT ========== */}
            <section className={`view ${screen === 'report' ? 'on' : ''}`} id="v-report">
              <div className="rep-head">
                {(() => {
                  const scoreValForRing = candidateForReport ? (candidateForReport.sc !== null ? candidateForReport.sc : 82) : 82;
                  const scoreColorForRing = scoreValForRing >= 71 ? 'var(--ok)' : scoreValForRing >= 51 ? 'var(--amber)' : 'var(--rec)';
                  const scoreAngleForRing = Math.round(scoreValForRing * 3.6);
                  const ringStyle = {
                    background: `conic-gradient(${scoreColorForRing} 0deg ${scoreAngleForRing}deg, var(--line-soft) ${scoreAngleForRing}deg 360deg)`
                  };
                  return (
                    <div className="ring" style={ringStyle}>
                      <i>
                        {candidateForReport ? (candidateForReport.sc !== null ? candidateForReport.sc : '—') : '82'}
                        <small>/ 100</small>
                      </i>
                    </div>
                  );
                })()}
                <div className="rep-id">
                  <div className="nm">{candidateForReport ? candidateForReport.name : 'Priya Sharma'}</div>
                  <div className="rl">
                    {activeOpening ? activeOpening.title : 'Audit & Tax Executive'} · completed{' '}
                    {candidateForReport && candidateForReport.completed_at ? formatLocalTime(candidateForReport.completed_at) : '16 Jul 2026'}
                    , {candidateForReport && candidateForReport.tab_switches ? 'with flags' : 'clean session'}
                  </div>
                  <div className="tags">
                    {candidateForReport && (
                      <>
                        <span className="badge b-ok">{candidateForReport.st || 'Scored'}</span>
                        {candidateForReport.highest_qualification && (
                          <span className="badge b-mute">{candidateForReport.highest_qualification}</span>
                        )}
                        {candidateForReport.nameotice_period && (
                          <span className="badge b-mute">Notice: {candidateForReport.nameotice_period}</span>
                        )}
                        {candidateForReport.expected_ctc && (
                          <span className="badge b-mute">Expected: {candidateForReport.expected_ctc}</span>
                        )}
                        {candidateForReport.relevant_experience && (
                          <span className="badge b-mute">Exp: {candidateForReport.relevant_experience}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="rep-actions">
                  <button className="btn primary" disabled={candidateForReport?.st === 'Shortlisted'} onClick={() => handleStatusChange('Shortlisted')}>{candidateForReport?.st === 'Shortlisted' ? 'Shortlisted' : 'Shortlist'}</button>
                  <button className="btn ghost" disabled={candidateForReport?.st === 'In progress' || candidateForReport?.st.startsWith('Rejected')} onClick={() => handleStatusChange('Hold')}>Hold</button>
                  <button className="btn danger" disabled={candidateForReport?.st.startsWith('Rejected')} onClick={() => handleStatusChange('Rejected')}>{candidateForReport?.st.startsWith('Rejected') ? 'Rejected' : 'Reject'}</button>
                </div>
              </div>

              <div className="rep-grid">
                <div>
                  <div className="card pad">
                    <div className="eyebrow">Recording</div>
                    <div className="player" style={{ marginTop: '10px' }}>
                      <div className="sil"></div>
                      <button className="playbtn" aria-label="Play" onClick={() => triggerToast('Video playback is simulated.')}></button>
                      <span className="ptime">00:00 / 34:12</span>
                    </div>
                    <div className="chapters">
                      {((candidateForReport && candidateForReport.transcript && candidateForReport.transcript.length > 0) ? candidateForReport.transcript : TRANSCRIPT).map((_, idx) => (
                        <button key={idx} className={`chap ${activeChapter === idx ? 'hot' : ''}`} title={`Q${idx + 1}`} onClick={() => handleJumpToChapter(idx)}></button>
                      ))}
                    </div>
                    <div className="chap-lab" id="chapLab">
                      Chapters: Q1–Q{((candidateForReport && candidateForReport.transcript && candidateForReport.transcript.length > 0) ? candidateForReport.transcript.length : TRANSCRIPT.length)} interview · click a segment to jump
                    </div>
                  </div>

                  <div className="secline">Transcript · evidence-linked · every question below was drawn from this flow's approved pools</div>
                  <div id="trList">
                    {((candidateForReport && candidateForReport.transcript && candidateForReport.transcript.length > 0) ? candidateForReport.transcript : TRANSCRIPT).map((t, idx) => {
                      const qText = t.question_text || t.q || "";
                      const tsText = t.timestamp || t.ts || "00:00";
                      const aText = t.answer_text || t.a || "";
                      const scoreVal = t.score_value !== undefined ? t.score_value : (t.sc || 0);
                      const feedback = t.feedback || "";
                      return (
                        <div className="tr-block" key={idx} id={`tr${idx}`}>
                          <div className="tr-q">
                            <b>{qText}</b>
                            <span className="ts">{tsText}</span>
                          </div>
                          <p className="tr-a">{aText}</p>
                          {feedback && <div style={{marginTop: '8px', padding: '10px', background: 'var(--surface2)', borderRadius: '4px', fontSize: '12px', borderLeft: '3px solid var(--primary)'}}>
                            <b>AI Feedback:</b> {feedback}
                          </div>}
                          <div className="tr-score">
                            <span className={`scorechip ${parseFloat(scoreVal) >= 7.1 ? 's-hi' : parseFloat(scoreVal) >= 5.1 ? 's-mid' : 's-lo'}`}>{scoreVal} / 10</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="card pad">
                    <div className="eyebrow">AI summary</div>
                    <p className="sumbox" style={{ marginTop: '8px' }}>
                      {candidateForReport && candidateForReport.ai_summary ? candidateForReport.ai_summary : "Priya presents as a structured, composed communicator with genuinely hands-on GST exposure. Her technical answers cite sections and forms correctly and she reasons from process rather than memory. The case-study response followed a credible reconcile → document → draft-reply sequence. Depth on company-audit procedure is her thinnest area — worth probing in the partner round."}
                    </p>
                  </div>

                  <div className="card pad" style={{ marginTop: '14px' }}>
                    <div className="eyebrow">Scorecard breakdown</div>
                    <div style={{ marginTop: '12px' }}>
                      {((candidateForReport && candidateForReport.scores && candidateForReport.scores.length > 0) ? candidateForReport.scores : [
                        { parameter_name: "Domain knowledge", score_value: 8.4 },
                        { parameter_name: "Communication", score_value: 8.8 },
                        { parameter_name: "Problem Solving", score_value: 8.1 },
                        { parameter_name: "Ownership & attitude", score_value: 7.4 },
                        { parameter_name: "Culture Fit", score_value: 7.0 }
                      ]).map((score, idx) => {
                        const percentage = Math.round(score.score_value * 10);
                        const scoreClass = score.score_value >= 7.1 ? "pbar" : score.score_value >= 5.1 ? "pbar mid" : "pbar lo";
                        return (
                          <div className={scoreClass} key={idx}>
                            <div className="pl">
                              <span>{score.parameter_name}</span>
                              <b>{score.score_value}</b>
                            </div>
                            <div className="track">
                              <i className="fill" style={{ width: `${percentage}%`, display: 'block' }}></i>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card pad" style={{ marginTop: '14px' }}>
                    <div className="eyebrow">Strengths &amp; watch-outs</div>
                    <ul className="pt-list" style={{ marginTop: '10px' }}>
                      <li><span className="pm g">＋</span>Quotes expected concepts and principles structure accurately.</li>
                      <li><span className="pm g">＋</span>Case scenario response followed a standard, process-driven hierarchy.</li>
                      <li>
                        <span className="pm g">＋</span>Screening complete —{' '}
                        {candidateForReport && candidateForReport.transcript ? candidateForReport.transcript.filter(t => (t.score_value !== undefined ? t.score_value : parseFloat(t.sc)) >= 7.1).length : 5}{' '}
                        answers scored highly.
                      </li>
                      <li><span className="pm w">！</span>Verify specific application of concepts in partner round.</li>
                      {candidateForReport && candidateForReport.expected_ctc && (
                        <li><span className="pm w">！</span>Expected CTC: {candidateForReport.expected_ctc}.</li>
                      )}
                    </ul>
                  </div>

                  <div className="card pad" style={{ marginTop: '14px' }}>
                    <div className="eyebrow">Session integrity · basic flags</div>
                    <div className="integrity" style={{ marginTop: '10px' }}>
                      <span>Tab switches <b>{candidateForReport ? candidateForReport.tab_switches : 0}</b></span>
                      <span>Paste events <b>{candidateForReport ? candidateForReport.paste_events : 0}</b></span>
                      <span>Sittings <b>1</b></span>
                      <span>Replay used <b>{candidateForReport ? candidateForReport.replay_used : 1} of 6</b></span>
                    </div>
                  </div>

                  <div className="card pad" style={{ marginTop: '14px' }}>
                    <div className="eyebrow">Partner note · overrides AI score</div>
                    <textarea
                      className="note-area"
                      value={partnerNoteText}
                      onChange={(e) => setPartnerNoteText(e.target.value)}
                      placeholder="e.g. Solid on GST. Verify audit exposure in person. — MK"
                    ></textarea>
                    <div style={{ marginTop: '10px', textAlign: 'right' }}>
                      <button className="btn ghost sm" onClick={() => handleSavePartnerNote(partnerNoteText)}>Save note</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ========== VIEW: INTERVIEW FLOWS ========== */}
            <section className={`view ${screen === 'flow' ? 'on' : ''}`} id="v-flow">
              <div className="vhead">
                <div>
                  <h2>Interview flows</h2>
                  <p>Each flow owns its rounds <b>and its own question pools</b> — Articleship questions never mix with Audit-Executive questions.</p>
                </div>
                <div style={{ display: 'flex', gap: '9px' }}>
                  <button className="btn ghost" onClick={() => { 
                    setFlowWizEditingId(activeFlow.id);
                    setFlowWizRounds(JSON.parse(JSON.stringify(activeFlow.rounds || []))); 
                    setFlowWizName(activeFlow.name); 
                    setFlowWizTitle(activeFlow.jobTitle); 
                    setFlowWizDept(activeFlow.department); 
                    setFlowWizDesc(activeFlow.description); 
                    setFlowWizVersion(activeFlow.version); 
                    setFlowWizTab('rounds');
                    setFlowWizModel(activeFlow.ai_model || 'sonnet');
                    setFlowWizStep(2);
                    setFlowWizOriginalData(JSON.parse(JSON.stringify(activeFlow)));
                    setFlowWizOpen(true); 
                  }}>Edit flow</button>
                  <button className="btn primary" onClick={() => { 
                    setFlowWizEditingId(null);
                    const defaultRounds = [{ id: Date.now(), type: 'hr', name: 'HR Screening', description: 'Initial screening round', questions: [] }];
                    setFlowWizRounds(defaultRounds); 
                    setFlowWizName(''); 
                    setFlowWizTitle(''); 
                    setFlowWizDept(''); 
                    setFlowWizDesc(''); 
                    setFlowWizVersion('v1'); 
                    setFlowWizTab('rounds');
                    setFlowWizModel('sonnet');
                    setFlowWizStep(1);
                    setFlowWizOriginalData({
                      name: '',
                      jobTitle: '',
                      department: '',
                      description: '',
                      rounds: defaultRounds,
                      ai_model: 'sonnet'
                    });
                    setFlowWizOpen(true); 
                  }}>+ Create Interview Flow</button>
                </div>
              </div>

              <div className="secline">Published templates · each carries its own question pools · usable for any opening</div>
              <div className="tmpl-row" id="tmplRow">
                {templates.map((t) => (
                  <div className={`tmpl-card ${t.is_live ? 'live' : ''} ${activeFlowId === t.id ? 'active-select' : ''}`} key={t.id} onClick={() => setActiveFlowId(t.id)} style={{ cursor: 'pointer' }}>
                    <div className="tmpl-top">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <b>{t.name}</b>
                        <div>
                          <span className={`badge ${t.is_live ? 'b-ok' : 'b-amber'}`}>{t.is_live ? 'Published' : 'Draft'}</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="btn ghost" 
                          style={{ 
                            padding: '2px 8px', 
                            minWidth: 'auto', 
                            border: 'none', 
                            background: 'transparent', 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: 'var(--muted)',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFlowMenuId(openFlowMenuId === t.id ? null : t.id);
                          }}
                        >
                          ⋮
                        </button>
                        {openFlowMenuId === t.id && (
                          <div className="card" style={{
                            position: 'absolute',
                            right: 0,
                            top: '28px',
                            width: '180px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            zIndex: 50,
                            backgroundColor: '#fff',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            padding: '6px 0',
                            display: 'flex',
                            flexDirection: 'column'
                          }} onClick={(e) => e.stopPropagation()}>
                            <button className="menu-item-btn" onClick={() => handleMenuEditFlow(t)}>Edit Flow</button>
                            <button className="menu-item-btn" onClick={() => handleMenuDuplicateFlow(t)}>Duplicate Flow</button>
                            <button className="menu-item-btn" onClick={() => handleMenuViewQuestions(t)}>View Questions</button>
                            <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                            <button className="menu-item-btn" style={{ color: 'var(--rec)' }} onClick={() => handleMenuDeleteFlow(t)}>Delete Flow</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <small>{t.description} · Calculated duration: <b>{getFlowCalculatedDuration(t)} mins</b></small>
                  </div>
                ))}
              </div>

              <div className="secline">Editing · {activeFlow.name} (Attached to: {activeFlow.jobTitle})</div>
              <div className="tabs" id="flowTabs" style={{ marginTop: '4px' }}>
                <button className={`tab ${flowTab === 'rounds' ? 'on' : ''}`} onClick={() => setFlowTab('rounds')}>Rounds &amp; cost</button>
                <button className={`tab ${flowTab === 'questions' ? 'on' : ''}`} onClick={() => setFlowTab('questions')}>
                  Question pools · all approved ✓
                </button>
              </div>

              {/* FLOW SUBPANE: ROUNDS & COST */}
              {flowTab === 'rounds' && (
                <div className="fpane on" id="fp-rounds">
                  <div className="fb-grid">
                    <div>
                      <div id="rounds">
                        {activeFlow.rounds && activeFlow.rounds.map((r, idx) => {
                          const T = ROUND_TYPES[r.type];
                          return (
                            <div className="round-card" key={r.id || idx}>
                              <div className="rc-order">
                                <div className="rc-num">{String(idx + 1).padStart(2, "0")}</div>
                              </div>
                              <div className="rc-main">
                                <div className="rc-top">
                                  <h4>{r.name || (T ? T.label : r.type)}</h4>
                                  {T && T.cam && <span className="rc-cam">● ON CAMERA</span>}
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 6px 0' }}>{r.description}</p>
                                <div className="rc-row">
                                  <span className="rc-field">
                                    Duration: <b>{getRoundCalculatedDuration(r)} min</b>
                                  </span>
                                  <span className="rc-field" style={{ color: 'var(--faint)', marginLeft: '12px' }}>
                                    {r.questions ? `${r.questions.length} questions` : '0 questions'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="addround" style={{ marginTop: '14px', width: '100%' }} onClick={handleOpenMainRoundModal}>
                        ＋ Add a round — form · video · case study · MCQ
                      </button>
                    </div>

                    <div className="meter">
                      <div className="meter-card">
                        <div className="eyebrow">Estimated cost</div>
                        <div className="meter-total">₹{Math.round((getFlowCalculatedDuration(activeFlow) * (MODELS.find(m => m.id === activeModel)?.rate || 1.2) + 6) * 100) / 100} <small>/ interview</small></div>
                        <div className="meter-sub">Calculated from total questions time limits.</div>
                        <div id="costLines">
                          <div className="m-line">
                            <span>Evaluated duration · {getFlowCalculatedDuration(activeFlow)} mins</span>
                            <b>₹{Math.round((getFlowCalculatedDuration(activeFlow) * (MODELS.find(m => m.id === activeModel)?.rate || 1.2)) * 100) / 100}</b>
                          </div>
                          <div className="m-line">
                            <span>Processing &amp; report</span>
                            <b>₹6.00</b>
                          </div>
                        </div>
                      </div>

                      <div className="card pad model-card">
                        <h4>AI model for this flow</h4>
                        <div id="models">
                          {MODELS.map(m => (
                            <label className={`model-opt ${activeModel === m.id ? 'on' : ''}`} key={m.id}>
                              <input type="radio" name="mdl" checked={activeModel === m.id} onChange={() => {
                                setActiveModel(m.id);
                                flowService.updateFlow(activeFlow.id, { ai_model: m.id }).then(() => {
                                  setTemplates(templates.map(t => t.id === activeFlow.id ? { ...t, ai_model: m.id } : t));
                                  triggerToast(`Model updated to ${m.name}`);
                                });
                              }} />
                              <span className="grow">
                                <b>{m.name}</b>
                                <small>{m.note}</small>
                              </span>
                              <span className="rate">₹{m.rate.toFixed(2)}/min</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FLOW SUBPANE: QUESTION POOLS */}
              {flowTab === 'questions' && (
                <div className="fpane on" id="fp-questions">
                  <div className="assure">
                    <span className="lk">✓</span>
                    <span><b>Scoped to this flow, approved by you.</b> These pools belong to <b>{activeFlow.name}</b> alone — every flow carries its own separate set. Interviews draw at random from the questions below.</span>
                  </div>

                  <div className="filters">
                    {activeFlow.rounds.map((r, rIdx) => (
                      <button className={`fchip ${selectedWizRoundIdx === rIdx ? 'on' : ''}`} key={rIdx} onClick={() => setSelectedWizRoundIdx(rIdx)}>
                        Round {rIdx + 1}: {r.name || (ROUND_TYPES[r.type] ? ROUND_TYPES[r.type].label : r.type)} · {r.questions ? r.questions.length : 0} Qs
                      </button>
                    ))}
                  </div>

                  <div id="poolArea">
                    <div className="pool-head">
                      <span>Total questions in this round: <b>{activeFlow.rounds[selectedWizRoundIdx]?.questions?.length || 0}</b></span>
                      <span className="grow"></span>
                      <span className="duration-indicator">Round Duration: {getRoundCalculatedDuration(activeFlow.rounds[selectedWizRoundIdx])} mins</span>
                    </div>

                    {activeFlow.rounds[selectedWizRoundIdx]?.questions?.map((it, idx) => (
                      <div className="qcard" key={it.id || idx}>
                        <div className="qtop">
                          <div style={{ flex: 1 }}>
                            <div className="qtxt">{it.question}</div>
                            <div className="rublab">Expected answer</div>
                            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 10px' }}>{it.answer}</p>
                            <div className="qmeta">
                              <span className="badge b-amber">Type: {it.type || 'MCQ'}</span>
                              <span className="badge b-info">Time limit: {it.timeLimit} mins</span>
                              <span className="badge b-mute">{it.difficulty}</span>
                              {it.required ? <span className="badge b-ok">Required</span> : <span className="badge b-mute">Optional</span>}
                            </div>
                          </div>
                          <div className="qside">
                            <button className="apprd" onClick={() => handleToggleActiveQuestionRequired(selectedWizRoundIdx, idx)}>
                              {it.required ? 'Required ✓' : 'Mark Required'}
                            </button>
                            <button className="qremove" onClick={() => handleRemoveActiveQuestion(selectedWizRoundIdx, idx)}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="composer">
                      <h4>Add a question to this round</h4>
                      <div className="lfield" style={{ marginBottom: '10px' }}>
                        <label>Type of Question</label>
                        <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)}>
                          <option value="" disabled>Type of Question</option>
                          <option value="MCQ">MCQ</option>
                          <option value="Case Study">Case Study</option>
                          <option value="Scenario-Based Question">Scenario-Based Question</option>
                          <option value="Excel Assessment">Excel Assessment</option>
                          <option value="Descriptive">Descriptive</option>
                        </select>
                      </div>
                      <div className="row2">
                        <div className="lfield">
                          <label>Question text (Mandatory)</label>
                          <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="Type the question exactly as the AI should ask it…"></textarea>
                        </div>
                        <div className="lfield">
                          <label>Expected / Acceptable Answer (Mandatory)</label>
                          <textarea value={newQuestionRub} onChange={(e) => setNewQuestionRub(e.target.value)} placeholder="What must a correct answer cover?"></textarea>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '10px' }}>
                        <div className="lfield">
                          <label>Question Time Limit (Mandatory - minutes)</label>
                          <input type="number" min="1" max="30" value={newQuestionTimeLimit} onChange={(e) => setNewQuestionTimeLimit(parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="lfield">
                          <label>Scorecard Association</label>
                          <select value={newQuestionFeed} onChange={(e) => setNewQuestionFeed(e.target.value)}>
                            <option>Domain knowledge</option>
                            <option>Communication</option>
                            <option>Problem Solving</option>
                            <option>Ownership & attitude</option>
                            <option>Culture Fit</option>
                          </select>
                        </div>
                      </div>
                      <button className="btn amber" onClick={handleAddQuestionToActiveFlow} style={{ marginTop: '14px' }}>
                        Add question to round
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ========== VIEW: SCORECARDS ========== */}
            <section className={`view ${screen === 'scorecard' ? 'on' : ''}`} id="v-scorecard">
              <div className="vhead">
                <div>
                  <h2>Scorecards</h2>
                  <p>Publish multiple scorecards and reuse them — you pick one when creating an opening.</p>
                </div>
                <button className="btn primary" onClick={() => { 
                  setScardWizCriteria([
                    { name: 'Technical Skills', maxMarks: 10, weight: 50, mandatory: true }, 
                    { name: 'Communication', maxMarks: 10, weight: 50, mandatory: true }
                  ]); 
                  setScardWizName(''); 
                  setScardWizTitle(''); 
                  setScardWizDept(''); 
                  setScardWizDesc(''); 
                  setScardWizAutoRejectThreshold(50);
                  setScardWizRatingScale('1-10');
                  setScardWizHardGateParam('Technical Skills');
                  setScardWizOpen(true); 
                }}>+ Create Scorecard</button>
              </div>

              <div className="secline">Published scorecards · reusable across openings</div>
              <div className="tmpl-row">
                {scorecards.map((s, idx) => (
                  <div className={`tmpl-card ${s.is_live ? 'live' : ''}`} key={s.id || idx}>
                    <div className="tmpl-top">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <b>{s.name}</b>
                        <div>
                          <span className={`badge ${s.is_live ? 'b-ok' : 'b-amber'}`}>{s.is_live ? 'Published' : 'Draft'}</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="btn ghost" 
                          style={{ 
                            padding: '2px 8px', 
                            minWidth: 'auto', 
                            border: 'none', 
                            background: 'transparent', 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: 'var(--muted)',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenScorecardMenuId(openScorecardMenuId === s.id ? null : s.id);
                          }}
                        >
                          ⋮
                        </button>
                        {openScorecardMenuId === s.id && (
                          <div className="card" style={{
                            position: 'absolute',
                            right: 0,
                            top: '28px',
                            width: '180px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            zIndex: 50,
                            backgroundColor: '#fff',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            padding: '6px 0',
                            display: 'flex',
                            flexDirection: 'column'
                          }} onClick={(e) => e.stopPropagation()}>
                            <button className="menu-item-btn" onClick={() => handleMenuEditScorecardTemplate(s)}>Edit Scorecard</button>
                            <button className="menu-item-btn" onClick={() => handleMenuDuplicateScorecardTemplate(s)}>Duplicate Scorecard</button>
                            <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                            <button className="menu-item-btn" style={{ color: 'var(--rec)' }} onClick={() => handleMenuDeleteScorecardTemplate(s)}>Delete Scorecard</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <small>{s.description}</small>
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Criteria: {s.criteria.map(c => `${c.name} (${c.weight}%)`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>



            {/* ========== VIEW: SETTINGS ========== */}
            <section className={`view ${screen === 'settings' ? 'on' : ''}`} id="v-settings">
              <div className="vhead">
                <div>
                  <h2>Settings</h2>
                  <p>Workspace-wide configuration for Kulkarni Mehta &amp; Associates.</p>
                </div>
              </div>

              <div className="tabs" id="settingsTabs">
                <button className={`tab ${settingsTab === 'team' ? 'on' : ''}`} onClick={() => setSettingsTab('team')}>Team &amp; roles</button>
                <button className={`tab ${settingsTab === 'brand' ? 'on' : ''}`} onClick={() => setSettingsTab('brand')}>Candidate branding</button>
                <button className={`tab ${settingsTab === 'billing' ? 'on' : ''}`} onClick={() => setSettingsTab('billing')}>Plan &amp; billing</button>
                
              </div>

              {settingsTab === 'team' && (
                <div className="set-pane on" id="t-team">
                  <div className="card pad" style={{ maxWidth: '640px' }}>
                    <div className="member"><span className="mini-av">MK</span><span className="grow"><b>Meera Kulkarni</b><small>meera@kmandassociates.in · approves questions &amp; flows</small></span><select defaultValue="Admin"><option>Admin</option><option>Recruiter</option><option>Reviewer</option></select></div>
                    <div className="member"><span className="mini-av">RK</span><span className="grow"><b>CA Rajesh Kulkarni</b><small>Partner · sees shortlisted reports only</small></span><select defaultValue="Reviewer"><option>Admin</option><option>Recruiter</option><option>Reviewer</option></select></div>
                    <div className="member"><span className="mini-av">VG</span><span className="grow"><b>Vaishali Gokhale</b><small>HR · creates openings, sends invites — cannot approve questions</small></span><select defaultValue="Recruiter"><option>Admin</option><option>Recruiter</option><option>Reviewer</option></select></div>
                    <div style={{ marginTop: '14px' }}><button className="btn ghost sm" onClick={() => triggerToast('Invite sent — they set their own password.')}>+ Invite teammate</button></div>
                  </div>
                </div>
              )}

              {settingsTab === 'brand' && (
                <div className="set-pane on" id="t-brand">
                  <div className="card pad" style={{ maxWidth: '640px' }}>
                    <div className="brandprev">
                      <div>
                        <div className="logo-tile" style={{ backgroundColor: activeBrandColor }}>KM</div>
                        <div className="swatches">
                          {['#155048', '#1B3B6F', '#5A2A6E', '#8A3324'].map(c => (
                            <span className={`sw ${activeBrandColor === c ? 'on' : ''}`} key={c} style={{ backgroundColor: c }} onClick={() => setActiveBrandColor(c)}></span>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <b style={{ fontSize: '14px' }}>What candidates see</b>
                        <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '6px 0 12px' }}>Your logo, firm name and colour appear across the whole candidate experience. Hirelens stays a discreet footer credit.</p>
                        <button className="btn ghost sm" onClick={() => triggerToast('Previewing branding...')}>Preview candidate view</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'billing' && (
                <div className="set-pane on" id="t-billing">
                  <div className="card pad" style={{ maxWidth: '640px' }}>
                    <div className="plan-line"><span>Plan</span><b>{subscriptionDetails ? subscriptionDetails.plan_name : 'Growth — ₹14,999 / month'}</b></div>
                    <div className="plan-line"><span>Days Remaining</span><b>{subscriptionDetails ? subscriptionDetails.days_remaining + ' days' : '250 / month'}</b></div>
                    <div className="plan-line"><span>Used this cycle</span><b>182</b></div>
                    <div className="bigtrack"><i></i></div>
                    <p className="sc-note">Renews {subscriptionDetails ? new Date(subscriptionDetails.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Aug 2026'} · overage billed at ₹79 / interview · AI usage (₹7,462 this month) billed at cost, no markup.</p>
                    <div style={{ display: 'flex', gap: '9px', marginTop: '14px' }}>
                      <button className="btn primary sm" onClick={() => triggerToast('Plan comparison.')}>Upgrade to Scale</button>
                      <button className="btn ghost sm" onClick={() => triggerToast('Invoices: Jun ₹14,999 · May ₹14,999')}>Invoices</button>
                    </div>
                  </div>
                </div>
              )}

              
            </section>

            {/* ========== VIEW: PROFILE ========== */}
            <section className={`view ${screen === 'profile' ? 'on' : ''}`} id="v-profile" style={{ padding: '0 30px 40px' }}>
              <div className="vhead" style={{ marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', color: 'var(--petrol-2)' }}>My Profile</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
                    View and update your personal details, workspace role, and security settings.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', alignItems: 'start' }}>
                {/* Left Card: Avatar & Summary */}
                <div className="card pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'relative', width: '130px', height: '130px', margin: '15px 0' }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: 'var(--amber-soft)',
                      color: 'var(--amber-deep)',
                      fontSize: '38px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '4px solid var(--line-soft)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                    }}>
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        currentUser ? `${profileFirstName[0] || ''}${profileLastName[0] || ''}` : 'MK'
                      )}
                    </div>
                    
                    {/* Hover Photo Upload Overlay */}
                    <label htmlFor="profile-upload" style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      backgroundColor: 'var(--petrol)',
                      color: '#fff',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                      transition: 'transform 0.15s'
                    }} className="upload-badge-hover">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <input id="profile-upload" type="file" accept="image/*" onChange={handleProfilePicChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                  
                  <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', margin: '10px 0 4px', color: 'var(--ink)' }}>
                    {profileFirstName} {profileLastName}
                  </h3>
                  <span className="badge b-ok" style={{ marginBottom: '16px' }}>{profileRole}</span>
                  
                  <div style={{ width: '100%', borderTop: '1px solid var(--line-soft)', padding: '16px 0 0', textAlign: 'left', fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px', color: 'var(--muted)' }}>
                      Email Address
                      <div style={{ color: 'var(--ink)', fontWeight: 500, marginTop: '2px', wordBreak: 'break-all' }}>
                        {currentUser ? currentUser.email : 'meera@kulkarni.co'}
                      </div>
                    </div>
                    <div style={{ color: 'var(--muted)' }}>
                      Workspace Organization
                      <div style={{ color: 'var(--ink)', fontWeight: 600, marginTop: '2px' }}>
                        {profileOrg || 'Kulkarni & Co.'}
                      </div>
                    </div>
                  </div>
                  
                  {profilePic && (
                    <button 
                      className="btn sm danger" 
                      style={{ marginTop: '16px', width: '100%' }} 
                      onClick={() => { setProfilePic(''); triggerToast("Profile picture removed! Save to persist changes."); }}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Right Area: Profile Details & Password Reset */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Card 1: Personal Details */}
                  <form className="card pad" onSubmit={handleSaveProfile}>
                    <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', color: 'var(--petrol-2)' }}>Personal Information</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        Update your public profile name, contact number, date of birth, and home address.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="lfield">
                        <label>First Name</label>
                        <input value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} required placeholder="First name" />
                      </div>
                      <div className="lfield">
                        <label>Last Name</label>
                        <input value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} required placeholder="Last name" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="lfield">
                        <label>Phone Number</label>
                        <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="e.g. +91 98765 43210" />
                      </div>
                      <div className="lfield">
                        <label>Date of Birth</label>
                        <input type="date" value={profileDob} onChange={(e) => setProfileDob(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="lfield">
                        <label>Organization Name</label>
                        <input value={profileOrg} onChange={(e) => setProfileOrg(e.target.value)} placeholder="Organization / Tenant" />
                      </div>
                      <div className="lfield">
                        <label>System Role</label>
                        <select value={profileRole} onChange={(e) => setProfileRole(e.target.value)}>
                          <option value="Admin">Admin</option>
                          <option value="Recruiter">Recruiter</option>
                          <option value="Reviewer">Reviewer</option>
                        </select>
                      </div>
                    </div>

                    <div className="lfield" style={{ marginBottom: '24px' }}>
                      <label>Work Address</label>
                      <textarea value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} placeholder="Full office/home address" rows={3} />
                    </div>

                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '16px', textAlign: 'right' }}>
                      <button type="submit" className="btn primary">
                        Save Profile Details
                      </button>
                    </div>
                  </form>

                  {/* Card 2: Password Reset */}
                  <form className="card pad" onSubmit={handleResetPassword}>
                    <div style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '20px' }}>
                      <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', color: 'var(--petrol-2)' }}>Reset Account Password</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        To change your account password, verify your current password first.
                      </p>
                    </div>

                    <div className="lfield" style={{ marginBottom: '16px' }}>
                      <label>Current Password</label>
                      <input type="password" value={profileCurrentPassword} onChange={(e) => setProfileCurrentPassword(e.target.value)} required placeholder="••••••••" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div className="lfield">
                        <label>New Password</label>
                        <input type="password" value={profileNewPassword} onChange={(e) => setProfileNewPassword(e.target.value)} required placeholder="At least 6 characters" />
                      </div>
                      <div className="lfield">
                        <label>Confirm New Password</label>
                        <input type="password" value={profileConfirmPassword} onChange={(e) => setProfileConfirmPassword(e.target.value)} required placeholder="Confirm new password" />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <small style={{ color: 'var(--faint)', fontFamily: 'var(--font-m)' }}>Security tip: Use a mixture of letters, numbers, and symbols.</small>
                      <button type="submit" className="btn amber">
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </section>

          </div>
        </div>
      )}

      {/* ================= MODAL: INVITE ================= */}
      {inviteModalOpen && (
        <div className="overlay on" id="inviteModal" onClick={(e) => { if (e.target.id === 'inviteModal') setInviteModalOpen(false); }}>
          <div className="modal">
            <div className="modal-h"><h3>Invite candidates</h3><button className="modal-x" onClick={() => setInviteModalOpen(false)}>✕</button></div>
            <div className="mtabs">
              <button className={`mtab ${inviteModalTab === 'one' ? 'on' : ''}`} onClick={() => setInviteModalTab('one')}>One candidate</button>
              <button className={`mtab ${inviteModalTab === 'bulk' ? 'on' : ''}`} onClick={() => setInviteModalTab('bulk')}>Bulk CSV</button>
            </div>
            
            {inviteModalTab === 'one' && (
              <div className="pad" id="m-one">
                <div className="lfield">
                  <label>Opening</label>
                  <select 
                    value={inviteOpeningId} 
                    onChange={(e) => setInviteOpeningId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)', background: '#fff' }}
                  >
                    {openings.map(op => (
                      <option key={op.id} value={op.id}>{op.title}</option>
                    ))}
                  </select>
                </div>
                <div className="lfield">
                  <label>Candidate name</label>
                  <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Ananya Kulkarni" />
                </div>
                <div className="lfield">
                  <label>Email</label>
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="lfield">
                  <label>Link expires</label>
                  <select 
                    value={inviteExpiryHours} 
                    onChange={(e) => setInviteExpiryHours(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--line)', background: '#fff' }}
                  >
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
                 <button 
                  className="btn primary" 
                  style={{ width: '100%', marginTop: '10px' }} 
                  onClick={handleInviteCandidate}
                  disabled={isSendingInvite}
                >
                  {isSendingInvite ? "Sending invite..." : "Send interview invite"}
                </button>
              </div>
            )}

            {inviteModalTab === 'bulk' && (
              <div className="pad" id="m-bulk">
                <div className="dropzone"><b>Drop your CSV here</b> or click to browse<span className="mono">columns: name, email, phone(optional) · up to 500 rows</span></div>
                <button className="btn primary" style={{ width: '100%', marginTop: '14px' }} onClick={() => { setInviteModalOpen(false); triggerToast("248 valid rows imported — invites queued."); }}>
                  Import &amp; send invites
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW OPENING WIZARD ================= */}
      {wizOpen && (
        <div className="overlay on" id="wizModal" onClick={(e) => { if (e.target.id === 'wizModal') setWizOpen(false); }}>
          <div className="modal big">
            <div className="modal-h"><h3>New job opening</h3><button className="modal-x" onClick={() => setWizOpen(false)}>✕</button></div>
            
            <div className="wdots" id="wdots">
              <div className={`wdot ${wizStep >= 1 ? 'on' : ''}`}><i></i><span>1 · ROLE DETAILS</span></div>
              <div className={`wdot ${wizStep >= 2 ? 'on' : ''}`}><i></i><span>2 · INTERVIEW FLOW</span></div>
              <div className={`wdot ${wizStep >= 3 ? 'on' : ''}`}><i></i><span>3 · EVAL SCORECARD</span></div>
              <div className={`wdot ${wizStep >= 4 ? 'on' : ''}`}><i></i><span>4 · REVIEW &amp; LAUNCH</span></div>
            </div>

            {/* WIZARD STEP 1: ROLE DETAILS */}
            {wizStep === 1 && (
              <div className="pad wpane on" id="w1">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="lfield">
                    <label>Job Title</label>
                    <input value={wizTitle} onChange={(e) => setWizTitle(e.target.value)} placeholder="e.g. React Frontend Engineer" />
                  </div>
                  <div className="lfield">
                    <label>Department</label>
                    <input value={wizDept} onChange={(e) => setWizDept(e.target.value)} placeholder="e.g. Audit, Engineering" />
                  </div>
                  <div className="lfield">
                    <label>Location</label>
                    <input value={wizLocation} onChange={(e) => setWizLocation(e.target.value)} placeholder="e.g. Pune, hybrid" />
                  </div>
                  <div className="lfield">
                    <label>Salary Band</label>
                    <input value={wizSalary} onChange={(e) => setWizSalary(e.target.value)} placeholder="e.g. ₹6.0 - ₹9.0 LPA" />
                  </div>
                  <div className="lfield">
                    <label>Hiring Manager</label>
                    <input value={wizHiringManager} onChange={(e) => setWizHiringManager(e.target.value)} placeholder="e.g. Meera Kulkarni" />
                  </div>
                  <div className="lfield">
                    <label>Employment Type</label>
                    <select value={wizType} onChange={(e) => setWizType(e.target.value)}>
                      <option>Full-time</option>
                      <option>Articleship</option>
                      <option>Internship</option>
                      <option>Contract</option>
                    </select>
                  </div>
                  <div className="lfield">
                    <label>Experience Level</label>
                    <select value={wizExp} onChange={(e) => setWizExp(e.target.value)}>
                      <option>Fresher</option>
                      <option>0–2 years</option>
                      <option>2–5 years</option>
                      <option>5+ years</option>
                    </select>
                  </div>
                  <div className="lfield">
                    <label>Default Interview Duration (Optional Display)</label>
                    <select value={wizDefaultDuration} onChange={(e) => setWizDefaultDuration(e.target.value)}>
                      <option>30 Minutes</option>
                      <option>45 Minutes</option>
                      <option>60 Minutes</option>
                      <option>90 Minutes</option>
                      <option>Custom Duration</option>
                    </select>
                  </div>
                </div>
                <div className="lfield" style={{ marginTop: '10px' }}>
                  <label>Job Description</label>
                  <textarea value={wizDesc} onChange={(e) => setWizDesc(e.target.value)} placeholder="Describe the role requirements for template auto-matching..."></textarea>
                </div>
              </div>
            )}

            {/* WIZARD STEP 2: FLOW TEMPLATE SELECTION (SMART MATCHES) */}
            {wizStep === 2 && (
              <div className="pad wpane on" id="w2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Manage the attached interview flow for this job opening.</p>
                  <button className="btn ghost sm" onClick={() => { setWizAttachedFlowId(null); triggerToast("Skipped flow attachment. Saved as Draft."); handleJobWizardGo(1); }}>Attach Later</button>
                </div>

                <div className="flow-attach-section" style={{ marginBottom: '16px' }}>
                  {!wizAttachedFlowId ? (
                    <div className="wassure" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <b style={{ color: 'var(--amber-deep)' }}>⚠️ No Interview Flow Attached</b>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn ghost sm" onClick={() => setWizSearchFlowOpen(true)}>Search Templates</button>
                          <button className="btn primary sm" onClick={() => {
                            const defFlow = templates[0] || { id: 1 };
                            setWizAttachedFlowId(defFlow.id);
                            triggerToast("Attached Default Flow.");
                          }}>Use Default Flow</button>
                          <button className="btn ghost sm" onClick={() => {
                            setFlowWizEditingId(null);
                            const defaultRounds = [{ id: Date.now(), type: 'hr', name: 'HR Screening', description: 'Initial screening round', questions: [] }];
                            setFlowWizRounds(defaultRounds);
                            setFlowWizName('');
                            setFlowWizTitle(wizTitle);
                            setFlowWizDept(wizDept);
                            setFlowWizDesc(wizDesc);
                            setFlowWizTab('rounds');
                            setFlowWizModel('sonnet');
                            setFlowWizStep(1);
                            setFlowWizOriginalData({
                              name: '',
                              jobTitle: wizTitle,
                              department: wizDept,
                              description: wizDesc,
                              rounds: defaultRounds,
                              ai_model: 'sonnet'
                            });
                            setFlowWizOpen(true);
                          }}>Create New Flow</button>
                          <button className="btn ghost sm" onClick={() => setWizSearchFlowOpen(true)}>Attach Existing Flow</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const attachedFlow = templates.find(t => t.id === wizAttachedFlowId);
                      const flowDuration = attachedFlow ? getFlowCalculatedDuration(attachedFlow) : 0;
                      return (
                        <div className="wassure" style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok)', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ok-deep)' }}>
                                ✓ Attached Flow: {attachedFlow ? attachedFlow.name : 'Unknown Flow'}
                              </div>
                              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
                                Version: <b>{attachedFlow ? (attachedFlow.version || 'v1') : 'v1'}</b> · Estimated Duration: <b>{flowDuration} mins</b>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn ghost sm" onClick={() => setWizSearchFlowOpen(true)}>Change Flow</button>
                              <button className="btn ghost sm" onClick={() => setFlowPreviewOpen(flowPreviewOpen === wizAttachedFlowId ? null : wizAttachedFlowId)}>
                                {flowPreviewOpen === wizAttachedFlowId ? 'Hide Preview' : 'Preview Flow'}
                              </button>
                              <button className="btn ghost sm" style={{ color: 'var(--rec)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => setWizAttachedFlowId(null)}>Remove Flow</button>
                            </div>
                          </div>
                          {flowPreviewOpen === wizAttachedFlowId && attachedFlow && (
                            <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                              <h5 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 8px 0' }}>Rounds inside template:</h5>
                              <ol style={{ fontSize: '11px', margin: '4px 0 0 16px', padding: 0 }}>
                                {attachedFlow.rounds.map((r, rIdx) => (
                                  <li key={rIdx}>{r.name || (ROUND_TYPES[r.type]?.label || r.type)} ({getRoundCalculatedDuration(r)} mins · {r.questions?.length || 0} Qs)</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {(!wizAttachedFlowId || wizSearchFlowOpen) && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Select from available templates:</p>
                      {wizSearchFlowOpen && <button className="linkbtn" onClick={() => setWizSearchFlowOpen(false)}>Collapse List</button>}
                    </div>
                    <div id="wizTmpls" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {getRankedFlowTemplates().map(({ template: t, score }) => (
                        <div className={`pick ${wizAttachedFlowId === t.id ? 'on' : ''}`} key={t.id} onClick={() => { setWizAttachedFlowId(t.id); setWizSearchFlowOpen(false); }}>
                          <input type="radio" name="wt" checked={wizAttachedFlowId === t.id} readOnly />
                          <span className="grow">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <b>{t.name}</b>
                              <span className={`match-badge ${score >= 75 ? 'high' : ''}`}>{score}% Match</span>
                            </span>
                            <small>{t.description} · Calculated duration: <b>{getFlowCalculatedDuration(t)} mins</b></small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 3: SCORECARD SELECTION */}
            {wizStep === 3 && (
              <div className="pad wpane on" id="w3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Manage the attached evaluation scorecard for this job opening.</p>
                  <button className="btn ghost sm" onClick={() => { setWizAttachedScorecardId(null); triggerToast("Skipped scorecard. Saved as Draft."); handleJobWizardGo(1); }}>Attach Later</button>
                </div>

                <div className="scorecard-attach-section" style={{ marginBottom: '16px' }}>
                  {!wizAttachedScorecardId ? (
                    <div className="wassure" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <b style={{ color: 'var(--amber-deep)' }}>⚠️ No Scorecard Attached</b>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn ghost sm" onClick={() => setWizSearchScorecardOpen(true)}>Search Templates</button>
                          <button className="btn primary sm" onClick={() => {
                            const defScard = scorecards[0] || { id: 1 };
                            setWizAttachedScorecardId(defScard.id);
                            triggerToast("Attached Default Scorecard.");
                          }}>Use Default Scorecard</button>
                          <button className="btn ghost sm" onClick={() => {
                            setScardWizCriteria([
                              { name: 'Technical Skills', maxMarks: 10, weight: 50, mandatory: true }, 
                              { name: 'Communication', maxMarks: 10, weight: 50, mandatory: true }
                            ]);
                            setScardWizName('');
                            setScardWizTitle(wizTitle);
                            setScardWizDept(wizDept);
                            setScardWizDesc(wizDesc);
                            setScardWizAutoRejectThreshold(50);
                            setScardWizRatingScale('1-10');
                            setScardWizHardGateParam('Technical Skills');
                            setScardWizOpen(true);
                          }}>Create New Scorecard</button>
                          <button className="btn ghost sm" onClick={() => setWizSearchScorecardOpen(true)}>Attach Existing Scorecard</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const attachedScard = scorecards.find(s => s.id === wizAttachedScorecardId);
                      return (
                        <div className="wassure" style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok)', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ok-deep)' }}>
                                ✓ Attached Scorecard: {attachedScard ? attachedScard.name : 'Unknown Scorecard'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn ghost sm" onClick={() => setWizSearchScorecardOpen(true)}>Change Scorecard</button>
                              <button className="btn ghost sm" onClick={() => setScorecardPreviewOpen(scorecardPreviewOpen === wizAttachedScorecardId ? null : wizAttachedScorecardId)}>
                                {scorecardPreviewOpen === wizAttachedScorecardId ? 'Hide Preview' : 'Preview Scorecard'}
                              </button>
                              <button className="btn ghost sm" style={{ color: 'var(--rec)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => setWizAttachedScorecardId(null)}>Remove Scorecard</button>
                            </div>
                          </div>
                          {scorecardPreviewOpen === wizAttachedScorecardId && attachedScard && (
                            <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                              <h5 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 8px 0' }}>Parameters and Weights:</h5>
                              <ul style={{ fontSize: '11px', margin: '4px 0 0 16px', padding: 0 }}>
                                {attachedScard.criteria.map((c, cIdx) => (
                                  <li key={cIdx}>{c.name} · Weight: <b>{c.weight}%</b> {c.mandatory && '· Mandatory'}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {(!wizAttachedScorecardId || wizSearchScorecardOpen) && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Select from available scorecards:</p>
                      {wizSearchScorecardOpen && <button className="linkbtn" onClick={() => setWizSearchScorecardOpen(false)}>Collapse List</button>}
                    </div>
                    <div id="wizScards" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {getRankedScorecardTemplates().map(({ template: s, score }) => (
                        <div className={`pick ${wizAttachedScorecardId === s.id ? 'on' : ''}`} key={s.id} onClick={() => { setWizAttachedScorecardId(s.id); setWizSearchScorecardOpen(false); }}>
                          <input type="radio" name="wsc" checked={wizAttachedScorecardId === s.id} readOnly />
                          <span className="grow">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <b>{s.name}</b>
                              <span className={`match-badge ${score >= 75 ? 'high' : ''}`}>{score}% Match</span>
                            </span>
                            <small>{s.description}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 4: REVIEW & LAUNCH */}
            {wizStep === 4 && (
              <div className="pad wpane on" id="w4">
                <div className="plan-line"><span>Job Opening</span><b>{wizTitle || 'Unnamed opening'}</b></div>
                <div className="plan-line"><span>Department</span><b>{wizDept || 'General'}</b></div>
                <div className="plan-line"><span>Salary band</span><b>{wizSalary || '—'}</b></div>
                <div className="plan-line"><span>Location</span><b>{wizLocation || '—'}</b></div>
                <div className="plan-line"><span>Hiring Manager</span><b>{wizHiringManager || '—'}</b></div>
                <div className="plan-line"><span>Interview Flow</span><b>{wizAttachedFlowId ? templates.find(t => t.id === wizAttachedFlowId)?.name : 'Not Attached (Attach Later selected)'}</b></div>
                <div className="plan-line"><span>Scorecard Template</span><b>{wizAttachedScorecardId ? scorecards.find(s => s.id === wizAttachedScorecardId)?.name : 'Not Attached (Attach Later selected)'}</b></div>
                <div className="plan-line"><span>Estimated Duration</span><b>{wizAttachedFlowId ? `${getFlowCalculatedDuration(templates.find(t => t.id === wizAttachedFlowId))} mins (Auto calculated from flow)` : 'Not Attached (status will be Draft)'}</b></div>
                
                <div style={{ marginTop: '14px' }}>
                  {(!wizAttachedFlowId || !wizAttachedScorecardId) ? (
                    <div className="wassure" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)' }}>
                      <span>⚠️ <b>Attach Later in progress</b>: Because template configurations are missing, this job opening will be saved in <b>Draft</b> status. You can publish it once templates are attached.</span>
                    </div>
                  ) : (
                    <div className="wassure">
                      <span>✓ Job is fully verified and ready to be launched to Live candidate pools.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="wnav">
              <button className="btn ghost" id="wBack" onClick={() => handleJobWizardGo(-1)} style={{ visibility: wizStep === 1 ? 'hidden' : 'visible' }}>← Back</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn ghost" onClick={handleCreateJobAsDraft}>Save Draft</button>
                <button className="btn primary" id="wNext" onClick={() => handleJobWizardGo(1)}>
                  {wizStep === 4 ? 'Publish Job Opening' : 'Continue →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FLOW BUILDING WIZARD (TABBED INTERVIEW FLOW EDITOR) ================= */}
      {flowWizOpen && (
        <div className="overlay on" id="flowWizModal" onClick={(e) => { if (e.target.id === 'flowWizModal') handleCloseAttempt(); }}>
          <div className="modal big" style={{ 
            width: flowWizStep === 1 ? '550px' : '950px', 
            maxWidth: '95vw', 
            maxHeight: '92vh', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'width 0.25s ease' 
          }}>
            <div className="modal-h" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <span className="eyebrow" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  {flowWizEditingId !== null ? 'Editing Flow Template' : 'Creating Flow Template'}
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                  {flowWizStep === 1 ? 'Basic Details' : (flowWizEditingId !== null ? `${flowWizName || 'Unnamed Flow'} (Attached to: ${flowWizTitle || 'General'})` : 'New Interview Flow')}
                </h3>
              </div>
              <button className="modal-x" onClick={handleCloseAttempt}>✕</button>
            </div>

            {/* FLOW WIZ STEP 1: BASIC INFORMATION */}
            {flowWizStep === 1 && (
              <div className="pad" style={{ padding: '24px' }}>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Provide the basic details for this interview flow template before adding rounds.</p>
                
                <div className="lfield" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Flow Name (Mandatory)</label>
                  <input style={{ padding: '10px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} value={flowWizName} onChange={(e) => setFlowWizName(e.target.value)} placeholder="e.g. Audit & Tax Screening" required />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="lfield" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Target Job Title</label>
                    <input style={{ padding: '10px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} value={flowWizTitle} onChange={(e) => setFlowWizTitle(e.target.value)} placeholder="e.g. Audit & Tax Executive" />
                  </div>
                  <div className="lfield" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Department</label>
                    <input style={{ padding: '10px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} value={flowWizDept} onChange={(e) => setFlowWizDept(e.target.value)} placeholder="e.g. Audit & Tax" />
                  </div>
                </div>

                <div className="lfield" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Short Description</label>
                  <input style={{ padding: '10px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} value={flowWizDesc} onChange={(e) => setFlowWizDesc(e.target.value)} placeholder="Brief summary of flow goals (e.g. Verify core tax and accounting knowledge)" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '10px' }}>
                  <button type="button" className="btn ghost" onClick={handleCloseAttempt}>Cancel</button>
                  <button type="button" className="btn primary" onClick={() => {
                    if (!(flowWizName || '').trim()) {
                      triggerToast("Flow Name is required.");
                      return;
                    }
                    setFlowWizStep(2);
                  }}>Next</button>
                </div>
              </div>
            )}

            {/* FLOW WIZ STEP 2: TABBED ROUNDS CONFIG & QUESTIONS MAPPING */}
            {flowWizStep === 2 && (
              <>
                {/* TAB SELECTOR INSIDE MODAL */}
                <div className="tabs" style={{ margin: '14px 24px 0 24px', borderBottom: '1px solid #eee' }}>
                  <button className={`tab ${flowWizTab === 'rounds' ? 'on' : ''}`} onClick={() => setFlowWizTab('rounds')} style={{ paddingBottom: '10px', fontSize: '13px' }}>
                    Rounds &amp; cost
                  </button>
                  <button className={`tab ${flowWizTab === 'questions' ? 'on' : ''}`} onClick={() => setFlowWizTab('questions')} style={{ paddingBottom: '10px', fontSize: '13px' }}>
                    Question pools · all approved ✓
                  </button>
                </div>

                {/* MODAL MAIN CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: '380px' }}>
                  {flowWizTab === 'rounds' && (
                    <div className="pad" style={{ padding: '20px 24px' }}>
                      <div className="fb-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
                        
                        {/* LEFT PANEL: ROUNDS LIST */}
                        <div>
                          {/* Mini Details Display (Read only / inline edit) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px', padding: '12px', background: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px' }}>
                            <div className="lfield" style={{ margin: 0 }}>
                              <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Flow Name</label>
                              <input style={{ padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} value={flowWizName} onChange={(e) => setFlowWizName(e.target.value)} placeholder="e.g. Audit & Tax Screening" />
                            </div>
                            <div className="lfield" style={{ margin: 0 }}>
                              <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Target Job Title</label>
                              <input style={{ padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} value={flowWizTitle} onChange={(e) => setFlowWizTitle(e.target.value)} placeholder="e.g. Audit & Tax Executive" />
                            </div>
                            <div className="lfield" style={{ margin: 0 }}>
                              <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Department</label>
                              <input style={{ padding: '6px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} value={flowWizDept} onChange={(e) => setFlowWizDept(e.target.value)} placeholder="e.g. Audit & Tax" />
                            </div>
                          </div>

                          {/* Rounds List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {flowWizRounds.map((r, idx) => {
                              const T = ROUND_TYPES[r.type];
                              return (
                                <div className="round-card" key={r.id || idx} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px 16px', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <div style={{ marginRight: '14px', fontSize: '16px', color: 'var(--muted)', fontWeight: 600 }}>
                                      {String(idx + 1).padStart(2, "0")}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>
                                          {r.name || (T ? T.label : r.type)}
                                          {T && T.cam && (
                                            <span className="rc-cam" style={{ marginLeft: '8px', fontSize: '9px', fontWeight: 600, color: 'var(--rec)', background: 'var(--rec-soft)', padding: '1px 5px', borderRadius: '3px' }}>
                                              ● ON CAMERA
                                            </span>
                                          )}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                          <button className="linkbtn" onClick={() => handleWizMoveRound(idx, -1)} style={{ fontSize: '11px', padding: '2px' }} title="Move Up">▲</button>
                                          <button className="linkbtn" onClick={() => handleWizMoveRound(idx, 1)} style={{ fontSize: '11px', padding: '2px' }} title="Move Down">▼</button>
                                          <button className="linkbtn" onClick={() => handleOpenRoundModal(idx)} style={{ fontSize: '11px', padding: '2px' }}>✎ Edit</button>
                                          <button className="linkbtn" style={{ color: 'var(--rec)', fontSize: '11px', padding: '2px' }} onClick={() => handleConfirmDeleteRound(idx)}>✕ Delete</button>
                                        </div>
                                      </div>
                                      <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: '2px 0 6px 0', lineHeight: 1.4 }}>{r.description}</p>
                                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                        Duration: <b>{getRoundCalculatedDuration(r)} min</b> · <span style={{ marginLeft: '8px' }}>{r.questions ? `${r.questions.length} questions` : '0 questions'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {flowWizRounds.length === 0 && (
                              <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', margin: '30px 0' }}>No rounds added yet. Click "+ Add Round" below to create one.</p>
                            )}
                            <button className="addround" style={{ width: '100%', marginTop: '6px', padding: '10px', border: '1px dashed #ccc', background: '#fcfcfc', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '12px', color: 'var(--petrol)', fontWeight: 500 }} onClick={() => handleOpenRoundModal(null)}>
                              ＋ Add a round — form · video · case study · MCQ
                            </button>
                          </div>
                        </div>

                        {/* RIGHT PANEL: COST ESTIMATOR & MODEL SELECTOR */}
                        <div>
                          {/* Cost Box */}
                          <div className="meter-card" style={{ background: '#0e2b26', color: '#fff', padding: '16px 20px', borderRadius: '12px' }}>
                            <div className="eyebrow" style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>Estimated cost</div>
                            <div className="meter-total" style={{ fontSize: '30px', fontWeight: 'bold', margin: '6px 0', color: '#fff' }}>
                              ₹{Math.round((flowWizRounds.reduce((sum, r) => sum + getRoundCalculatedDuration(r), 0) * (MODELS.find(m => m.id === flowWizModel)?.rate || 1.2) + 6) * 100) / 100} <small style={{ fontSize: '11px', fontWeight: 'normal', color: 'rgba(255,255,255,0.6)' }}>/ interview</small>
                            </div>
                            <div className="meter-sub" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Calculated from total questions time limits.</div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
                                <span>Evaluated duration · {flowWizRounds.reduce((sum, r) => sum + getRoundCalculatedDuration(r), 0)} mins</span>
                                <b>₹{Math.round((flowWizRounds.reduce((sum, r) => sum + getRoundCalculatedDuration(r), 0) * (MODELS.find(m => m.id === flowWizModel)?.rate || 1.2)) * 100) / 100}</b>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                <span>Processing &amp; report</span>
                                <b>₹6.00</b>
                              </div>
                            </div>
                          </div>

                          {/* AI Model Selector */}
                          <div className="card pad model-card" style={{ marginTop: '14px', border: '1px solid #eee', borderRadius: '12px', padding: '14px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>AI model for this flow</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {MODELS.map(m => (
                                <label className={`model-opt ${flowWizModel === m.id ? 'on' : ''}`} key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', gap: '10px' }}>
                                  <input type="radio" name="wizMdl" checked={flowWizModel === m.id} onChange={() => setFlowWizModel(m.id)} />
                                  <span className="grow" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <b style={{ fontSize: '12px' }}>{m.name}</b>
                                    <small style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{m.note}</small>
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: 600 }}>₹{m.rate.toFixed(2)}/min</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {flowWizTab === 'questions' && (
                    <div className="pad" style={{ padding: '20px 24px' }}>
                      <div className="assure" style={{ background: 'var(--petrol-soft)', color: 'var(--petrol)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                        <span style={{ fontSize: '12px', lineHeight: 1.4 }}>
                          <b>Scoped to this flow, approved by you.</b> These pools belong to this flow template alone — every flow carries its own separate set. Interviews draw at random from the questions below.
                        </span>
                      </div>

                      <div className="filters" style={{ margin: '0 0 14px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {flowWizRounds.map((r, rIdx) => (
                          <button className={`fchip ${flowWizSelectedRoundIdx === rIdx ? 'on' : ''}`} key={rIdx} onClick={() => setFlowWizSelectedRoundIdx(rIdx)}>
                            Round {rIdx + 1}: {r.name}
                          </button>
                        ))}
                      </div>

                      {flowWizRounds.length > 0 ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                              Round Duration: <b>{getRoundCalculatedDuration(flowWizRounds[flowWizSelectedRoundIdx])} mins</b> · ({flowWizRounds[flowWizSelectedRoundIdx]?.questions?.length || 0} Questions)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <select 
                                className="btn sm" 
                                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                                value={generateCount}
                                onChange={(e) => setGenerateCount(Number(e.target.value))}
                                disabled={isGeneratingQuestions}
                              >
                                <option value={3}>3 Questions</option>
                                <option value={5}>5 Questions</option>
                                <option value={10}>10 Questions</option>
                              </select>
                              <button 
                                className="btn primary sm" 
                                style={{ background: 'var(--amber-deep)', border: 'none', whiteSpace: 'nowrap' }} 
                                onClick={handleGenerateAIQuestions}
                                disabled={isGeneratingQuestions}
                              >
                                {isGeneratingQuestions ? "Generating..." : "✨ Generate AI Questions"}
                              </button>
                              
                              {/* --- BULK UPLOAD START --- */}
                              <button 
                                className="btn ghost sm" 
                                style={{ whiteSpace: 'nowrap' }}
                                onClick={downloadQuestionTemplate}
                                title="Download Excel template for bulk import"
                              >
                                📥 Download Template
                              </button>
                              
                              <label className="btn ghost sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                                📤 Bulk Upload
                                <input 
                                  type="file" 
                                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                  style={{ display: 'none' }}
                                  onChange={handleBulkUploadQuestions}
                                />
                              </label>
                              {/* --- BULK UPLOAD END --- */}

                              <button className="btn primary sm" style={{ whiteSpace: 'nowrap' }} onClick={() => handleOpenQuestionModal(null)}>+ Add Question</button>
                            </div>
                          </div>

                          <div className="q-list-container" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                            {flowWizRounds[flowWizSelectedRoundIdx]?.questions?.map((q, qIdx) => (
                              <div className="q-list-item" key={q.id || qIdx} style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ flex: 1, marginRight: '14px', fontSize: '12.5px', lineHeight: 1.4 }}>
                                  <b>Q:</b> {q.question} <span style={{ color: 'var(--muted)', fontSize: '11px', marginLeft: '6px' }}>(Type: {q.type || 'MCQ'} · Time: {q.timeLimit} min · Max Marks: {q.marks || 10} · {q.difficulty})</span>
                                </span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <button 
                                    className="linkbtn" 
                                    style={{ color: 'var(--amber-deep)', fontSize: '12px' }} 
                                    onClick={() => handleRegenerateSingleQuestion(qIdx)} 
                                    disabled={isGeneratingQuestions}
                                  >
                                    Regenerate
                                  </button>
                                  <button className="linkbtn" onClick={() => handleOpenQuestionModal(qIdx)} style={{ fontSize: '12px' }}>Edit</button>
                                  <button className="linkbtn" style={{ color: 'var(--rec)', fontSize: '12px' }} onClick={() => handleWizDeleteQuestion(qIdx)}>Delete</button>
                                </div>
                              </div>
                            ))}
                            {(!flowWizRounds[flowWizSelectedRoundIdx]?.questions || flowWizRounds[flowWizSelectedRoundIdx].questions.length === 0) && (
                              <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', margin: '40px 0' }}>No questions added to this round yet. Click "Generate AI Questions" or "+ Add Question" to create one.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', margin: '40px 0' }}>Please add a round in the Rounds & Cost tab before adding questions.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER */}
                <div className="wnav" style={{ borderTop: '1px solid #eee', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                  <button className="btn ghost" onClick={() => {
                    if (flowWizEditingId !== null) {
                      handleCloseAttempt();
                    } else {
                      setFlowWizStep(1); // Go back to details
                    }
                  }}>{flowWizEditingId !== null ? 'Cancel' : '← Back'}</button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn ghost" onClick={() => handleSaveFlowWizard(false)}>Save Draft</button>
                    <button className="btn primary" onClick={() => handleSaveFlowWizard(true)}>Publish Flow Template</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
      {/* ================= MODAL: JAY  DIALOG ================= */}
      {confirmUnsavedOpen && (
        <div className="overlay on" style={{ zIndex: 100 }} id="unsavedConfirmModal" onClick={(e) => { if (e.target.id === 'unsavedConfirmModal') setConfirmUnsavedOpen(false); }}>
          <div className="modal" style={{ width: '400px', padding: '24px', position: 'relative' }}>
            <div className="modal-h" style={{ borderBottom: 'none', padding: 0 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Unsaved Changes</h3>
              <button className="modal-x" onClick={() => setConfirmUnsavedOpen(false)}>✕</button>
            </div>
            <div className="pad" style={{ padding: '16px 0 0 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                You have unsaved changes. Do you want to save them before leaving?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn primary" style={{ width: '100%', padding: '10px 14px' }} onClick={handleConfirmSave}>
                  Save Changes
                </button>
                <button className="btn ghost" style={{ width: '100%', padding: '10px 14px', color: 'var(--rec)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={handleConfirmDiscard}>
                  Discard Changes
                </button>
                <button className="btn ghost" style={{ width: '100%', padding: '10px 14px' }} onClick={() => setConfirmUnsavedOpen(false)}>
                  Continue Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE JOB OPENING CONFIRMATION ================= */}
      {deleteJobConfirmOp && (
        <div className="overlay on" id="deleteJobModal" style={{ zIndex: 100 }} onClick={(e) => { if (e.target.id === 'deleteJobModal') setDeleteJobConfirmOp(null); }}>
          <div className="modal" style={{ width: '420px', padding: 0, overflow: 'hidden' }}>
            <div className="pad" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Delete Job Opening</h3>
              
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5', color: '#444' }}>
                Are you sure you want to delete <br />
                <b style={{ color: 'var(--ink)' }}>"{deleteJobConfirmOp.title}"</b>?
              </p>

              <div style={{ background: '#fcf8f2', border: '1px solid #f5ebd5', borderRadius: '8px', padding: '14px 18px', margin: '0 0 20px 0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#b27b08', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  This action will permanently remove:
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                  <li>Job Details</li>
                  <li>Interview Pipeline</li>
                  <li>Candidate Assignments</li>
                  <li>Interview Flow Links</li>
                  <li>Scorecard Links</li>
                </ul>
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', fontWeight: 600, color: 'var(--rec)' }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="btn ghost" onClick={() => setDeleteJobConfirmOp(null)}>Cancel</button>
                <button className="btn" style={{ background: 'var(--rec)', color: '#fff', border: 'none' }} onClick={() => {
                  openingService.deleteOpening(deleteJobConfirmOp.id).then(() => {
                    const newList = openings.filter(o => o.id !== deleteJobConfirmOp.id);
                    setOpenings(newList);
                    triggerToast(`Job "${deleteJobConfirmOp.title}" deleted.`);
                    setDeleteJobConfirmOp(null);
                  });
                }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE INTERVIEW FLOW CONFIRMATION ================= */}
      {deleteFlowConfirmOp && (
        <div className="overlay on" id="deleteFlowModal" style={{ zIndex: 100 }} onClick={(e) => { if (e.target.id === 'deleteFlowModal') setDeleteFlowConfirmOp(null); }}>
          <div className="modal" style={{ width: '420px', padding: 0, overflow: 'hidden' }}>
            <div className="pad" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Delete Interview Flow</h3>
              
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5', color: '#444' }}>
                Are you sure you want to delete <br />
                <b style={{ color: 'var(--ink)' }}>"{deleteFlowConfirmOp.name}"</b>?
              </p>

              <div style={{ background: '#fcf8f2', border: '1px solid #f5ebd5', borderRadius: '8px', padding: '14px 18px', margin: '0 0 20px 0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#b27b08', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  This action will permanently remove:
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                  <li>Flow rounds configuration</li>
                  <li>Custom question pools</li>
                  <li>Job Opening associations</li>
                </ul>
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', fontWeight: 600, color: 'var(--rec)' }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="btn ghost" onClick={() => setDeleteFlowConfirmOp(null)}>Cancel</button>
                <button className="btn" style={{ background: 'var(--rec)', color: '#fff', border: 'none' }} onClick={() => {
                  flowService.deleteFlow(deleteFlowConfirmOp.id).then(() => {
                    const newList = templates.filter(t => t.id !== deleteFlowConfirmOp.id);
                    setTemplates(newList);
                    if (activeFlowId === deleteFlowConfirmOp.id && newList.length > 0) {
                      setActiveFlowId(newList[0].id);
                    }
                    triggerToast(`Flow "${deleteFlowConfirmOp.name}" deleted.`);
                    setDeleteFlowConfirmOp(null);
                  });
                }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE SCORECARD CONFIRMATION ================= */}
      {deleteScorecardConfirmOp && (
        <div className="overlay on" id="deleteScorecardModal" style={{ zIndex: 100 }} onClick={(e) => { if (e.target.id === 'deleteScorecardModal') setDeleteScorecardConfirmOp(null); }}>
          <div className="modal" style={{ width: '420px', padding: 0, overflow: 'hidden' }}>
            <div className="pad" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Delete Scorecard Template</h3>
              
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5', color: '#444' }}>
                Are you sure you want to delete <br />
                <b style={{ color: 'var(--ink)' }}>"{deleteScorecardConfirmOp.name}"</b>?
              </p>

              <div style={{ background: '#fcf8f2', border: '1px solid #f5ebd5', borderRadius: '8px', padding: '14px 18px', margin: '0 0 20px 0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#b27b08', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  This action will permanently remove:
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                  <li>Evaluation parameters and weights</li>
                  <li>Job Opening associations</li>
                </ul>
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', fontWeight: 600, color: 'var(--rec)' }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="btn ghost" onClick={() => setDeleteScorecardConfirmOp(null)}>Cancel</button>
                <button className="btn" style={{ background: 'var(--rec)', color: '#fff', border: 'none' }} onClick={() => {
                  scorecardService.deleteScorecard(deleteScorecardConfirmOp.id).then(() => {
                    const newList = scorecards.filter(s => s.id !== deleteScorecardConfirmOp.id);
                    setScorecards(newList);
                    triggerToast(`Scorecard "${deleteScorecardConfirmOp.name}" deleted.`);
                    setDeleteScorecardConfirmOp(null);
                  });
                }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {roundModalOpen && (
        <div className="overlay on" id="roundModal" style={{ zIndex: 85 }} onClick={(e) => { if (e.target.id === 'roundModal') setRoundModalOpen(false); }}>
          <div className="modal">
            <div className="modal-h">
              <h3>{roundModalEditIdx !== null ? "Edit Interview Round" : "Create Interview Round"}</h3>
              <button className="modal-x" onClick={() => setRoundModalOpen(false)}>✕</button>
            </div>
            <div className="pad">
              <div className="lfield">
                <label>Round Name (Required)</label>
                <input value={roundModalName} onChange={(e) => { setRoundModalName(e.target.value); setRoundModalNameError(''); }} placeholder="e.g. HR Screening, Live Coding" />
                {roundModalNameError && <span style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{roundModalNameError}</span>}
              </div>
              <div className="lfield" style={{ marginTop: '10px' }}>
                <label>Round Description (Optional)</label>
                <input value={roundModalDesc} onChange={(e) => setRoundModalDesc(e.target.value)} placeholder="Summary of round focus..." />
              </div>
              <div className="lfield" style={{ marginTop: '10px' }}>
                <label>Round Type</label>
                <select value={roundModalType} onChange={(e) => setRoundModalType(e.target.value)}>
                  {Object.keys(ROUND_TYPES).map(t => (
                    <option value={t} key={t}>{ROUND_TYPES[t].label}</option>
                  ))}
                  <option value="custom">Custom Round</option>
                </select>
              </div>

              <div className="btn-grid" style={{ marginTop: '20px' }}>
                <button className="btn ghost" onClick={() => setRoundModalOpen(false)}>Cancel</button>
                <button className="btn primary" onClick={handleSaveRoundModal}>
                  {roundModalEditIdx !== null ? "Update Round" : "Create Round"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= NEW MODAL: CREATE / EDIT QUESTION ================= */}
      {questionModalOpen && (
        <div className="overlay on" id="questionModal" style={{ zIndex: 85 }} onClick={(e) => { if (e.target.id === 'questionModal') setQuestionModalOpen(false); }}>
          <div className="modal">
            <div className="modal-h">
              <h3>{questionModalEditIdx !== null ? "Edit Interview Question" : "Create Interview Question"}</h3>
              <button className="modal-x" onClick={() => setQuestionModalOpen(false)}>✕</button>
            </div>
            <div className="pad">
              <div className="lfield">
                <label>Type of Question</label>
                <select value={questionModalType} onChange={(e) => { setQuestionModalType(e.target.value); setQuestionModalTypeError(''); }}>
                  <option value="" disabled>Type of Question</option>
                  <option value="MCQ">MCQ</option>
                  <option value="Case Study">Case Study</option>
                  <option value="Scenario-Based Question">Scenario-Based Question</option>
                  <option value="Excel Assessment">Excel Assessment</option>
                  <option value="Descriptive">Descriptive</option>
                  <option value="Subjective">Subjective</option>
                </select>
                {questionModalTypeError && <span style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{questionModalTypeError}</span>}
              </div>
              {questionModalType !== 'MCQ' ? (
                <>
                  <div className="lfield" style={{ marginTop: '10px' }}>
                    <label>Question (Required)</label>
                    <textarea value={questionModalText} onChange={(e) => { setQuestionModalText(e.target.value); setQuestionModalTextError(''); }} placeholder="Type the question details..." style={{ minHeight: '60px' }}></textarea>
                    {questionModalTextError && <span style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{questionModalTextError}</span>}
                  </div>
                  <div className="lfield" style={{ marginTop: '10px' }}>
                    <label>Expected / Acceptable Answer Details</label>
                    <textarea value={questionModalAnswer} onChange={(e) => setQuestionModalAnswer(e.target.value)} placeholder="Define ideal answers..." style={{ minHeight: '50px' }}></textarea>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div className="lfield">
                      <label>Difficulty</label>
                      <select value={questionModalDifficulty} onChange={(e) => setQuestionModalDifficulty(e.target.value)}>
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </div>
                    <div className="lfield">
                      <label>Marks</label>
                      <input type="number" min="1" max="100" value={questionModalMarks} onChange={(e) => setQuestionModalMarks(parseInt(e.target.value) || 10)} />
                    </div>
                    <div className="lfield">
                      <label>Time Limit (Required - minutes)</label>
                      <input type="number" min="1" max="60" value={questionModalTimeLimit} onChange={(e) => { setQuestionModalTimeLimit(parseInt(e.target.value)); setQuestionModalTimeError(''); }} />
                      {questionModalTimeError && <span style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{questionModalTimeError}</span>}
                    </div>
                    <div className="lfield">
                      <label>Round Gate</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%', minHeight: '34px' }}>
                        <input type="checkbox" checked={questionModalRequired} onChange={(e) => setQuestionModalRequired(e.target.checked)} />
                        <span style={{ fontSize: '12px' }}>Required Question</span>
                      </div>
                    </div>
                  </div>

                  <div className="lfield" style={{ marginTop: '10px' }}>
                    <label>Hints (Optional)</label>
                    <input value={questionModalHints} onChange={(e) => setQuestionModalHints(e.target.value)} placeholder="Provide interview hints..." />
                  </div>
                </>
              ) : (
                <div style={{ marginTop: '14px' }}>
                  {/* Group Level Time Limit */}
                  <div className="lfield" style={{ marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600, color: 'var(--amber)', fontSize: '13px' }}>MCQ Group Total Time Limit (Required - minutes)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="60" 
                      value={questionModalTimeLimit} 
                      onChange={(e) => { setQuestionModalTimeLimit(parseInt(e.target.value) || 1); setQuestionModalTimeError(''); }} 
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                    {questionModalTimeError && <span style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{questionModalTimeError}</span>}
                  </div>

                  {/* Collection of MCQ Cards */}
                  <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', marginBottom: '10px' }}>
                    {mcqList.map((mcq, idx) => {
                      const isCollapsed = mcqCollapsedStates[mcq.id] || false;
                      return (
                        <div 
                          key={mcq.id} 
                          style={{ 
                            border: '1.5px solid rgba(0, 0, 0, 0.08)', 
                            borderRadius: '8px', 
                            padding: '14px', 
                            marginBottom: '14px', 
                            background: 'rgba(0, 0, 0, 0.015)' 
                          }}
                        >
                          {/* Header of MCQ Card */}
                          <div 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              cursor: 'pointer',
                              borderBottom: isCollapsed ? 'none' : '1px solid rgba(0, 0, 0, 0.06)',
                              paddingBottom: isCollapsed ? '0' : '8px',
                              marginBottom: isCollapsed ? '0' : '12px'
                            }}
                            onClick={() => {
                              setMcqCollapsedStates(prev => ({ ...prev, [mcq.id]: !isCollapsed }));
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>
                              MCQ {idx + 1}: {mcq.question ? (mcq.question.substring(0, 30) + (mcq.question.length > 30 ? '...' : '')) : '(Empty Question)'}
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              {idx > 0 && (
                                <button 
                                  type="button" 
                                  style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: 'var(--rec)', 
                                    padding: '2px 6px',
                                    fontSize: '12px',
                                    cursor: 'pointer' 
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMcqCard(mcq.id);
                                  }}
                                >
                                  ✕ Delete
                                </button>
                              )}
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {isCollapsed ? '▼ Expand' : '▲ Collapse'}
                              </span>
                            </div>
                          </div>

                          {/* Content of MCQ Card */}
                          {!isCollapsed && (
                            <div>
                              {/* Question Text */}
                              <div className="lfield" style={{ marginBottom: '10px' }}>
                                <label>Question {idx + 1} Text (Required)</label>
                                <textarea 
                                  value={mcq.question} 
                                  onChange={(e) => handleUpdateMcqField(mcq.id, 'question', e.target.value)}
                                  placeholder={`Enter question ${idx + 1} details...`}
                                  style={{ minHeight: '50px', marginTop: '6px' }}
                                />
                              </div>

                              {/* Options List */}
                              <div className="lfield" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px' }}>Options (Min 2)</label>
                                {mcq.options.map((opt, optIdx) => (
                                  <div 
                                    key={optIdx} 
                                    style={{ 
                                      display: 'flex', 
                                      gap: '8px', 
                                      alignItems: 'center', 
                                      marginBottom: '8px' 
                                    }}
                                  >
                                    <span style={{ fontWeight: 600, width: '20px', textAlign: 'center', fontSize: '13px' }}>{opt.label}</span>
                                    <input 
                                      type="text" 
                                      value={opt.text} 
                                      onChange={(e) => handleUpdateMcqOptionText(mcq.id, optIdx, e.target.value)}
                                      placeholder={`Option ${opt.label} text`}
                                      style={{ flex: 1 }}
                                    />
                                    {mcq.options.length > 2 && (
                                      <button 
                                        type="button" 
                                        style={{ 
                                          padding: '6px 10px',
                                          background: 'transparent',
                                          border: '1.5px solid rgba(0,0,0,0.1)',
                                          borderRadius: '6px',
                                          color: 'var(--rec)',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => handleDeleteMcqOption(mcq.id, optIdx)}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {/* Add Option Button */}
                                {mcq.options.length < 10 && (
                                  <button 
                                    type="button"
                                    className="btn ghost sm" 
                                    style={{ 
                                      marginTop: '6px', 
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      height: '28px',
                                      minWidth: 'auto'
                                    }}
                                    onClick={() => handleAddMcqOption(mcq.id)}
                                  >
                                    + Add Option
                                  </button>
                                )}
                              </div>

                              {/* Correct Option Radio Group */}
                              <div className="lfield" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px' }}>Correct Answer (Select One)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px' }}>
                                  {mcq.options.map((opt, optIdx) => (
                                    <label 
                                      key={optIdx} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                      }}
                                    >
                                      <input 
                                        type="radio" 
                                        name={`correct-answer-${mcq.id}`}
                                        checked={mcq.correctAnswer === optIdx}
                                        onChange={() => handleUpdateMcqField(mcq.id, 'correctAnswer', optIdx)}
                                      />
                                      <span>Option {opt.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* MCQ Marks & Difficulty */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                <div className="lfield">
                                  <label>Marks</label>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max="100" 
                                    value={mcq.marks} 
                                    onChange={(e) => handleUpdateMcqField(mcq.id, 'marks', parseInt(e.target.value) || 1)}
                                  />
                                </div>
                                <div className="lfield">
                                  <label>Difficulty</label>
                                  <select 
                                    value={mcq.difficulty || 'Medium'} 
                                    onChange={(e) => handleUpdateMcqField(mcq.id, 'difficulty', e.target.value)}
                                  >
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Another MCQ Button */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '14px' }}>
                    <button 
                      type="button" 
                      className="btn ghost" 
                      style={{ width: '100%', borderStyle: 'dashed', height: '36px' }}
                      onClick={handleAddMcqCard}
                    >
                      + Add Another MCQ
                    </button>
                  </div>
                </div>
              )}

              {questionModalTextError && (
                <div style={{ color: 'var(--rec)', fontSize: '11px', marginTop: '8px', lineHeight: '1.4', background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  {questionModalTextError.split(" | ").map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="btn-grid" style={{ marginTop: '20px' }}>
                <button className="btn ghost" onClick={() => setQuestionModalOpen(false)}>Cancel</button>
                <button className="btn primary" onClick={handleSaveQuestionModal}>
                  {questionModalEditIdx !== null ? "Update Question" : "Add Question"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= NEW MODAL: DELETE ROUND CONFIRMATION ================= */}
      {roundDeleteConfirmIdx !== null && (
        <div className="overlay on" id="confirmDeleteModal" style={{ zIndex: 90 }}>
          <div className="modal" style={{ width: '400px' }}>
            <div className="modal-h">
              <h3>Delete Interview Round?</h3>
            </div>
            <div className="pad">
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Are you sure you want to delete this round? <b>This will permanently remove the round and all questions mapped inside it.</b>
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn ghost sm" onClick={() => setRoundDeleteConfirmIdx(null)}>Cancel</button>
                <button className="btn danger sm" onClick={executeDeleteRound}>Delete Round</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE SCORECARD ================= */}
      {scardWizOpen && (
        <div className="overlay on" id="scardModal" onClick={(e) => { if (e.target.id === 'scardModal') setScardWizOpen(false); }}>
          <div className="modal big" style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
            <div className="modal-h" style={{ flexShrink: 0, paddingBottom: '16px', borderBottom: '1px solid var(--line-soft)' }}>
              <h3>Create Scorecard Template</h3>
              <button className="modal-x" onClick={() => setScardWizOpen(false)}>✕</button>
            </div>
            
            <div className="pad" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="lfield">
                  <label>Scorecard Name (Mandatory)</label>
                  <input value={scardWizName} onChange={(e) => setScardWizName(e.target.value)} placeholder="e.g. Senior Frontend Scorecard" />
                </div>
                <div className="lfield">
                  <label>Target Job Title</label>
                  <input value={scardWizTitle} onChange={(e) => setScardWizTitle(e.target.value)} placeholder="e.g. React Developer" />
                </div>
                <div className="lfield">
                  <label>Department</label>
                  <input value={scardWizDept} onChange={(e) => setScardWizDept(e.target.value)} placeholder="e.g. Engineering" />
                </div>
                <div className="lfield">
                  <label>Description</label>
                  <input value={scardWizDesc} onChange={(e) => setScardWizDesc(e.target.value)} placeholder="Standard scorecard criteria details..." />
                </div>
              </div>

              <div className="secline">EVALUATION CRITERIA (TOTAL WEIGHT MUST SUM TO 100%)</div>

              <div className="sc-grid">
                <div>
                  <div className={`total-badge ${scardWizCriteria.reduce((sum, c) => sum + c.weight, 0) === 100 ? 'good' : 'bad'}`} style={{ marginBottom: '16px' }}>
                    <span>{scardWizCriteria.reduce((sum, c) => sum + c.weight, 0) === 100 ? 'Weights total 100% — ready to publish' : 'Weights must total 100%'}</span>
                    <span className="t">{scardWizCriteria.reduce((sum, c) => sum + c.weight, 0)}%</span>
                  </div>

                  <div style={{ paddingRight: '4px' }}>
                    {scardWizCriteria.map((c, idx) => (
                      <div className="param" key={idx}>
                        <div className="param-top">
                          <input 
                            type="text" 
                            value={c.name} 
                            onChange={(e) => updateCriteriaName(idx, e.target.value)} 
                            placeholder="Criteria Name" 
                          />
                          <span className="w">{c.weight}%</span>
                          <button 
                            className="rc-del" 
                            style={{ 
                              border: 'none', 
                              background: 'transparent', 
                              color: '#ef4444', 
                              cursor: 'pointer', 
                              fontSize: '11.5px', 
                              fontWeight: '600',
                              padding: '4px 8px', 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              borderRadius: '4px',
                              transition: 'background 0.2s'
                            }} 
                            onClick={() => handleRemoveCriteriaWiz(idx)}
                            title="Delete parameter"
                            onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            ✕ Delete
                          </button>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5" 
                          value={c.weight} 
                          onChange={(e) => updateCriteriaWeight(idx, parseInt(e.target.value) || 0)} 
                        />
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={c.mandatory} 
                              onChange={(e) => updateCriteriaMandatory(idx, e.target.checked)} 
                              style={{ accentColor: 'var(--amber-deep)' }}
                            />
                            Mandatory
                          </label>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Max Marks:
                            <input 
                              type="number" 
                              min="1" 
                              max="100" 
                              value={c.maxMarks || 10} 
                              onChange={(e) => updateCriteriaMaxMarks(idx, parseInt(e.target.value) || 10)} 
                              style={{ width: '40px', border: '1.5px solid var(--line)', borderRadius: '4px', padding: '2px 4px', textAlign: 'center', fontFamily: 'inherit' }}
                            />
                          </span>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <input 
                            type="text" 
                            className="param-desc" 
                            style={{ border: 'none', borderBottom: '1px dashed var(--line)', width: '100%', fontSize: '11.5px', color: 'var(--faint)', background: 'transparent', padding: '2px 0' }} 
                            value={c.description || ''} 
                            onChange={(e) => updateCriteriaDesc(idx, e.target.value)} 
                            placeholder="Add criteria description / details..." 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', textAlign: 'right', fontStyle: 'italic' }}>
                    * Parameter name and description changes are saved when you Save Draft or Publish.
                  </p>

                  <button className="addround" style={{ marginTop: '6px', width: '100%' }} onClick={handleAddDefaultParam}>
                    ＋ Add parameter
                  </button>

                </div>

                <div className="sc-side">
                  <div className="card pad">
                    <h4>Auto-reject threshold</h4>
                    <div className="thresh-val">{scardWizAutoRejectThreshold}<small> / 100 overall</small></div>
                    <input 
                      type="range" 
                      min="30" 
                      max="70" 
                      value={scardWizAutoRejectThreshold} 
                      step="5" 
                      onChange={(e) => setScardWizAutoRejectThreshold(parseInt(e.target.value) || 50)} 
                    />
                    <p className="sc-note">Candidates below this land in <b>Rejected (auto)</b> — no partner time spent.</p>
                  </div>

                  <div className="card pad">
                    <h4>Rating scale</h4>
                    <div className="scale-row">
                      <button className={scardWizRatingScale === '1-10' ? 'on' : ''} onClick={() => setScardWizRatingScale('1-10')}>1 – 10</button>
                      <button className={scardWizRatingScale === '1-5' ? 'on' : ''} onClick={() => setScardWizRatingScale('1-5')}>1 – 5</button>
                      <button className={scardWizRatingScale === 'A-E' ? 'on' : ''} onClick={() => setScardWizRatingScale('A-E')}>A – E</button>
                    </div>
                    <p className="sc-note">Shown on reports and exports.</p>
                  </div>

                  <div className="card pad">
                    <h4>Hard gate</h4>
                    <p style={{ fontSize: '13px' }}>
                      Select parameter as hard gate:
                      <select 
                        style={{ marginLeft: '8px', border: '1.5px solid var(--line)', borderRadius: '6px', padding: '4px 6px', fontFamily: 'inherit', fontSize: '12.5px' }} 
                        value={scardWizHardGateParam} 
                        onChange={(e) => setScardWizHardGateParam(e.target.value)}
                      >
                        <option value="">None</option>
                        {scardWizCriteria.map((c, i) => (
                          <option key={i} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </p>
                    <p className="sc-note" style={{ marginTop: '8px' }}>
                      If a candidate's score for the selected parameter is below 4.0 (or equivalent), they are rejected regardless of overall score.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="wnav" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--line-soft)', flexShrink: 0 }}>
              <button className="btn ghost" onClick={() => handleSaveScorecardWiz(false)}>Save Draft</button>
              <button className="btn primary" onClick={() => handleSaveScorecardWiz(true)}>Publish Scorecard</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
        <span className="tdot"></span>
        <span id="toastTxt">{toast.msg}</span>
      </div>

      {/* ================= PROTOTYPE SCREEN SELECTOR ================= */}
      <div className="proto">
        <div className={`proto-menu ${protoMenuOpen ? 'open' : ''}`} id="protoMenu">
          <h5>Prototype · screen map</h5>
          <button className={!isLoggedIn ? 'on' : ''} onClick={handleSignOut}>01 Login</button>
          <button className={isLoggedIn && screen === 'dash' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('dash'); setProtoMenuOpen(false); }}>02 Dashboard</button>
          <button className={isLoggedIn && screen === 'openings' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('openings'); setProtoMenuOpen(false); }}>03 Job openings</button>
          <button className={isLoggedIn && wizOpen ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('openings'); setWizOpen(true); setWizStep(1); setProtoMenuOpen(false); }}>04 New opening wizard ★</button>
          <button className={isLoggedIn && screen === 'pipeline' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('pipeline'); setProtoMenuOpen(false); }}>05 Candidate pipeline</button>
          <button className={isLoggedIn && screen === 'report' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('report'); setProtoMenuOpen(false); }}>06 Candidate report ★</button>
          <button className={isLoggedIn && screen === 'flow' && flowTab === 'rounds' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('flow'); setFlowTab('rounds'); setProtoMenuOpen(false); }}>07 Flow · rounds &amp; cost ★</button>
          <button className={isLoggedIn && screen === 'flow' && flowTab === 'questions' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('flow'); setFlowTab('questions'); setProtoMenuOpen(false); }}>08 Flow · question pools ★</button>
          <button className={isLoggedIn && screen === 'scorecard' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('scorecard'); setProtoMenuOpen(false); }}>09 Scorecards + templates</button>
          <button className={isLoggedIn && screen === 'settings' ? 'on' : ''} onClick={() => { if (!isLoggedIn) isLoggedIn(true); setScreen('settings'); setProtoMenuOpen(false); }}>10 Settings</button>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', margin: '6px 0' }}></div>
          <button style={{ color: 'var(--amber-deep)', fontWeight: 'bold' }} onClick={() => { window.history.pushState({}, '', '/candidate'); window.dispatchEvent(new Event('pathnamechange')); }}>11 Candidate Experience ↗</button>
        </div>
        <button className="proto-toggle" onClick={() => setProtoMenuOpen(!protoMenuOpen)}>
          <span className="pd"></span>PROTOTYPE · SCREENS
        </button>
      </div>

    </div>
  );

  function showScreen(scr) {
    setScreen(scr);
    window.scrollTo({ top: 0 });
  }
}





