import mockClient from '../api/client';

const MOCK_TRANSCRIPT = [
  { question_text: "Tell me about yourself and what draws you to audit and taxation.", timestamp: "00:41", score_value: 8.8, answer_text: "Two years with a mid-size Pune firm across GST compliance and tax audits. “What I enjoy is that every notice is a puzzle with a legal answer — you can actually close it.” Clear arc: articleship → compliance → wants advisory exposure." },
  { question_text: "A deadline you nearly missed — what changed afterwards?", timestamp: "05:12", score_value: 7.4, answer_text: "Sept GSTR-9 crunch, client sent books late. Escalated on day 2, split reconciliation with a colleague, filed with hours to spare. Now front-loads document requests by two weeks. Honest about the early mistake." },
  { question_text: "Staying accurate under busy-season pressure.", timestamp: "09:38", score_value: 7.6, answer_text: "Maker-checker habit even when solo — self-review the next morning. Maintains a personal error log; says repeat errors dropped after she started it." },
  { question_text: "Tax audit u/s 44AB vs statutory audit under the Companies Act.", timestamp: "14:06", score_value: 8.6, answer_text: "Correctly separated purpose, appointing authority, applicability thresholds and reporting forms (3CA/3CB-3CD vs audit report to members). Added turnover-limit nuance for F&O clients, unprompted." },
  { question_text: "Capitalise or expense a ₹3L machine repair?", timestamp: "18:22", score_value: 7.9, answer_text: "Framed the test as enhancement of future benefit vs restoration; asked what she'd check — nature of work, useful-life impact, capacity change. Cited AS 10 treatment correctly." },
  { question_text: "Monthly GST compliance calendar for a mid-size trading client.", timestamp: "22:48", score_value: 8.2, answer_text: "Ran the calendar in order — GSTR-1 by the 11th, 2B reconciliation, 3B by the 20th, vendor follow-ups for missing credits, quarterly touchpoints. Process-driven, not recited." },
  { question_text: "ASMT-10 notice, ₹4.2L ITC mismatch.", timestamp: "28:19", score_value: 8.1, answer_text: "Causes to check: timing differences, vendor non-filing, credit notes, RCM entries. Would call for purchase register, 2B downloads, vendor GSTR-1 status. Reply structure: reconcile item-wise, annex evidence, pay-with-interest only where genuinely ineligible." }
];

const MOCK_SCORES = [
  { parameter_name: "Domain knowledge", score_value: 8.5 },
  { parameter_name: "Communication", score_value: 8.0 },
  { parameter_name: "Problem Solving", score_value: 8.0 },
  { parameter_name: "Ownership & attitude", score_value: 7.5 },
  { parameter_name: "Culture Fit", score_value: 8.0 }
];

const INITIAL_CANDIDATES = [
  {
    id: 1,
    opening: 1,
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    status: "Shortlisted",
    score: 82,
    completed_at: "2026-07-16T10:30:00Z",
    tab_switches: 0,
    paste_events: 0,
    replay_used: 1,
    ai_summary: "Strong candidate with 2 years of solid core taxation experience in statutory auditing. Excellent clarity on GST rules and reconciliations.",
    partner_note: "Would fit well in the audit division.",
    scores: MOCK_SCORES,
    transcript: MOCK_TRANSCRIPT,
    created_at: "2026-07-14T09:00:00Z",
    updated_at: "2026-07-16T10:30:00Z"
  },
  {
    id: 2,
    opening: 1,
    name: "Rahul Deshmukh",
    email: "rahul.d@example.com",
    status: "Scored",
    score: 74,
    completed_at: "2026-07-16T11:45:00Z",
    tab_switches: 0,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "Good grasp of basic tax concepts. Communicates details well but is slightly slow in case responses.",
    partner_note: "",
    scores: MOCK_SCORES.map(s => ({ ...s, score_value: s.score_value - 0.8 })),
    transcript: MOCK_TRANSCRIPT.map(t => ({ ...t, score_value: t.score_value - 0.7 })),
    created_at: "2026-07-14T09:05:00Z",
    updated_at: "2026-07-16T11:45:00Z"
  },
  {
    id: 3,
    opening: 1,
    name: "Sneha Kulkarni",
    email: "sneha.k@example.com",
    status: "Scored",
    score: 68,
    completed_at: "2026-07-15T09:15:00Z",
    tab_switches: 2,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "Familiar with audit methods. Had minor tab switching events (2 times) during the assessment.",
    partner_note: "",
    scores: MOCK_SCORES.map(s => ({ ...s, score_value: s.score_value - 1.5 })),
    transcript: MOCK_TRANSCRIPT.map(t => ({ ...t, score_value: t.score_value - 1.2 })),
    created_at: "2026-07-14T09:10:00Z",
    updated_at: "2026-07-15T09:15:00Z"
  },
  {
    id: 4,
    opening: 1,
    name: "Neha Patil",
    email: "neha.patil@example.com",
    status: "Scored",
    score: 63,
    completed_at: "2026-07-15T15:20:00Z",
    tab_switches: 0,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "Basic understanding. Needs supervision on complex GST reconciliation matters.",
    partner_note: "",
    scores: MOCK_SCORES.map(s => ({ ...s, score_value: s.score_value - 2.0 })),
    transcript: MOCK_TRANSCRIPT.map(t => ({ ...t, score_value: t.score_value - 1.8 })),
    created_at: "2026-07-14T10:00:00Z",
    updated_at: "2026-07-15T15:20:00Z"
  },
  {
    id: 5,
    opening: 1,
    name: "Imran Shaikh",
    email: "imran.s@example.com",
    status: "In progress",
    score: null,
    completed_at: null,
    tab_switches: 0,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "",
    partner_note: "",
    scores: [],
    transcript: [],
    created_at: "2026-07-14T11:00:00Z",
    updated_at: "2026-07-14T11:00:00Z"
  },
  {
    id: 6,
    opening: 1,
    name: "Kavya Nair",
    email: "kavya.nair@example.com",
    status: "Invited",
    score: null,
    completed_at: null,
    tab_switches: 0,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "",
    partner_note: "",
    scores: [],
    transcript: [],
    created_at: "2026-07-15T10:00:00Z",
    updated_at: "2026-07-15T10:00:00Z"
  },
  {
    id: 7,
    opening: 1,
    name: "Aditya Joshi",
    email: "aditya.j@example.com",
    status: "Rejected (auto)",
    score: 41,
    completed_at: "2026-07-15T16:00:00Z",
    tab_switches: 0,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "Scores below minimum requirements on GST calculations and statutory requirements.",
    partner_note: "",
    scores: MOCK_SCORES.map(s => ({ ...s, score_value: s.score_value - 4.0 })),
    transcript: MOCK_TRANSCRIPT.map(t => ({ ...t, score_value: t.score_value - 4.0 })),
    created_at: "2026-07-14T09:40:00Z",
    updated_at: "2026-07-15T16:00:00Z"
  },
  {
    id: 8,
    opening: 1,
    name: "Tushar Bhosale",
    email: "tushar.b@example.com",
    status: "Rejected (auto)",
    score: 37,
    completed_at: "2026-07-14T11:10:00Z",
    tab_switches: 1,
    paste_events: 0,
    replay_used: 0,
    ai_summary: "Did not meet core parameters. Insufficient answers provided on machine capitalization.",
    partner_note: "",
    scores: MOCK_SCORES.map(s => ({ ...s, score_value: s.score_value - 4.5 })),
    transcript: MOCK_TRANSCRIPT.map(t => ({ ...t, score_value: t.score_value - 4.5 })),
    created_at: "2026-07-14T09:45:00Z",
    updated_at: "2026-07-14T11:10:00Z"
  }
];

const getStoredCandidates = () => {
  const stored = localStorage.getItem('hl_candidates');
  if (!stored) {
    localStorage.setItem('hl_candidates', JSON.stringify(INITIAL_CANDIDATES));
    return INITIAL_CANDIDATES;
  }
  return JSON.parse(stored);
};

const saveStoredCandidates = (candidates) => {
  localStorage.setItem('hl_candidates', JSON.stringify(candidates));
};

const formatCandidateForUI = (c) => {
  if (!c) return c;
  return {
    ...c,
    n: c.name,
    st: c.status,
    sc: c.score,
    fl: c.tab_switches,
    d: c.completed_at,
    rep: c.replay_used === 1
  };
};

export const candidateService = {
  getCandidates: async (openingId = null) => {
    try {
      const response = await mockClient.get('/api/candidates/');
      const list = response.data;
      const formatted = list.map(formatCandidateForUI);
      if (openingId) {
        return formatted.filter(c => c.opening === parseInt(openingId));
      }
      return formatted;
    } catch (e) {
      console.error("Failed to fetch candidates from API:", e);
      return [];
    }
  },

  getCandidateById: async (id) => {
    try {
      const response = await mockClient.get(`/api/candidates/${id}/`);
      return formatCandidateForUI(response.data);
    } catch (e) {
      console.error(`Failed to fetch candidate ${id} from API:`, e);
      throw e;
    }
  },

  inviteCandidate: async (name, email, openingId, expiryHours = 48) => {
    let finalOpeningId = openingId;
    
    // Clean up older auto-sync logic relying on localStorage for jobs
    const isTimestampId = parseInt(openingId) > 1000000000000;
    if (isTimestampId) {
      throw new Error("Cannot invite candidate to an unsaved/draft opening.");
    }

    const payload = { name, email, opening: finalOpeningId, expiry_hours: expiryHours };
    const response = await mockClient.post('/api/candidates/invite/', payload);
    const data = response.data;
    const createdCand = Array.isArray(data) ? data[0] : data;
    return formatCandidateForUI(createdCand);
  },

  updateCandidate: async (id, candidateData) => {
    try {
      const response = await mockClient.patch(`/api/candidates/${id}/`, candidateData);
      return formatCandidateForUI(response.data);
    } catch (e) {
      console.error(`Failed to update candidate ${id} via API:`, e);
      throw e;
    }
  },

  deleteCandidate: async (id) => {
    try {
      await mockClient.delete(`/api/candidates/${id}/`);
      return true;
    } catch (e) {
      console.error(`Failed to delete candidate ${id} via API:`, e);
      throw e;
    }
  }
};

export default candidateService;
