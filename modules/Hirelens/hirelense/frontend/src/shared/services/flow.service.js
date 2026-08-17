import mockClient from '../api/client';

const INITIAL_FLOWS = [
  {
    id: 1,
    tenant: 1,
    name: "Audit & Tax Screening",
    version: "v2",
    is_live: true,
    ai_model: "sonnet",
    rounds: [
      { id: 1, type: "form", dur: 5, order: 0, name: "Form Screening", description: "Verify qualifications and basic screening info", questions: [
        { id: 11, question: "Tell us about your highest qualification and attempts.", answer: "CA, M.Com or B.Com. Detail attempts if any.", timeLimit: 2, required: true, difficulty: "Easy" },
        { id: 12, question: "What is your current notice period?", answer: "Immediate, 15 days, 30 days.", timeLimit: 1, required: true, difficulty: "Easy" }
      ]},
      { id: 2, type: "hr", dur: 10, order: 1, name: "HR Round", description: "Verify soft skills and cultural fit parameters", questions: [
        { id: 13, question: "Tell me about yourself and what draws you to audit and taxation.", answer: "Clear career arc, genuine interest in compliance.", timeLimit: 4, required: true, difficulty: "Easy" },
        { id: 14, question: "Describe a deadline you nearly missed. What changed afterwards?", answer: "Honest Near-miss details, concrete action plan.", timeLimit: 4, required: true, difficulty: "Medium" }
      ]},
      { id: 3, type: "tech", dur: 10, order: 2, name: "Technical Screening", description: "Assess accounting and audit principles knowledge", questions: [
        { id: 15, question: "Explain the difference between a tax audit u/s 44AB and a statutory audit under the Companies Act.", answer: "Thresholds, form types, reporting authorities.", timeLimit: 5, required: true, difficulty: "Hard" },
        { id: 16, question: "A client repairs a machine for 3L. Capitalise or expense — how do you decide?", answer: "Enhancement vs restoration test, AS 10 rules.", timeLimit: 5, required: true, difficulty: "Medium" }
      ]},
      { id: 4, type: "case", dur: 10, order: 3, name: "Case Analysis", description: "Reconcile real-world ASMT notices", questions: [
        { id: 17, question: "ASMT-10 notice: GSTR-3B ITC exceeds 2B by 4.2L. Walk through your cause analysis and reply.", answer: "Timing diffs, vendor default, reconciliation steps.", timeLimit: 7, required: true, difficulty: "Hard" }
      ]},
      { id: 5, type: "mcq", dur: 5, order: 4, name: "Objective Test", description: "MCQ screening on GST regulations", questions: [
        { 
          id: 18, 
          question: "ITC on motor vehicles for transport of persons (seating <= 13) is blocked, except when used for—", 
          answer: "Further supply of such vehicles", 
          timeLimit: 1, 
          required: true, 
          difficulty: "Easy",
          options: ["Further supply of such vehicles", "Transportation of goods", "Making taxable supplies", "All of the above"],
          mcqs: [{
            id: 181,
            question: "ITC on motor vehicles for transport of persons (seating <= 13) is blocked, except when used for—",
            options: ["Further supply of such vehicles", "Transportation of goods", "Making taxable supplies", "All of the above"],
            correctAnswer: 0
          }]
        },
        { 
          id: 19, 
          question: "Under AS 2 / Ind AS 2, inventories are valued at—", 
          answer: "Lower of cost and NRV", 
          timeLimit: 1, 
          required: true, 
          difficulty: "Easy",
          options: ["Cost", "Net Realizable Value", "Lower of cost and NRV", "Higher of cost and NRV"],
          mcqs: [{
            id: 191,
            question: "Under AS 2 / Ind AS 2, inventories are valued at—",
            options: ["Cost", "Net Realizable Value", "Lower of cost and NRV", "Higher of cost and NRV"],
            correctAnswer: 2
          }]
        }
      ]}
    ],
    // Frontend extra UI metadata keys (these will map or be stored on client side)
    jobTitle: "Audit & Tax Executive",
    department: "Audit & Tax",
    description: "Tax audit, GST filings and compliance screening."
  },
  {
    id: 2,
    tenant: 1,
    name: "CA Articleship Screening",
    version: "v1",
    is_live: true,
    ai_model: "haiku",
    rounds: [
      { id: 6, type: "form", dur: 5, order: 0, name: "Academics Form", description: "Verify inter attempts", questions: [
        { id: 21, question: "CA Inter groups cleared and attempts", answer: "Both groups, first attempt", timeLimit: 2, required: true, difficulty: "Easy" }
      ]},
      { id: 7, type: "hr", dur: 10, order: 1, name: "HR Fit", description: "Assess learning attitude", questions: [
        { id: 22, question: "Why do you want to pursue articleship at our firm?", answer: "Eagerness to learn, knowledge of our client list.", timeLimit: 4, required: true, difficulty: "Easy" }
      ]}
    ],
    jobTitle: "Article Assistant",
    department: "Audit",
    description: "CA articleship screening for standard accounting candidates."
  },
  {
    id: 3,
    tenant: 1,
    name: "Sales Executive Screening",
    version: "v1",
    is_live: true,
    ai_model: "gptm",
    rounds: [
      { id: 8, type: "hr", dur: 5, order: 0, name: "Elevator Pitch", description: "Test presentation skills", questions: [
        { id: 31, question: "Introduce yourself and pitch our product in 2 minutes.", answer: "Clear communication, confident delivery.", timeLimit: 3, required: true, difficulty: "Medium" }
      ]}
    ],
    jobTitle: "Sales Executive",
    department: "Sales",
    description: "Sales executive screening with negotiation case play."
  }
];

const getStoredFlows = () => {
  const stored = localStorage.getItem('hl_flows');
  if (!stored) {
    localStorage.setItem('hl_flows', JSON.stringify(INITIAL_FLOWS));
    return INITIAL_FLOWS;
  }
  return JSON.parse(stored);
};

const saveStoredFlows = (flows) => {
  localStorage.setItem('hl_flows', JSON.stringify(flows));
};

export const flowService = {
  getFlows: async () => {
    const response = await mockClient.get('/api/flows/');
    return response.data || [];
  },

  getFlowById: async (id) => {
    const response = await mockClient.get(`/api/flows/${id}/`);
    return response.data;
  },

  createFlow: async (flowData) => {
    // Compute dynamic durations inside payload before API call
    const roundsWithCalculatedDurations = (flowData.rounds || []).map((r, index) => {
      const calculatedDur = r.questions && r.questions.length > 0
        ? r.questions.reduce((sum, q) => sum + (parseInt(q.timeLimit || q.time_limit) || 0), 0)
        : (r.dur || 5);
      return {
        ...r,
        dur: calculatedDur,
        order: r.order !== undefined ? r.order : index
      };
    });

    const payload = {
      ...flowData,
      rounds: roundsWithCalculatedDurations
    };

    const response = await mockClient.post('/api/flows/', payload);
    return response.data;
  },

  updateFlow: async (id, flowData) => {
    // Compute dynamic durations inside payload before API call
    const roundsWithCalculatedDurations = flowData.rounds ? flowData.rounds.map((r, i) => {
      const calculatedDur = r.questions && r.questions.length > 0
        ? r.questions.reduce((sum, q) => sum + (parseInt(q.timeLimit || q.time_limit) || 0), 0)
        : (r.dur || 5);
      return {
        ...r,
        dur: calculatedDur,
        order: r.order !== undefined ? r.order : i
      };
    }) : undefined;

    const payload = roundsWithCalculatedDurations ? {
      ...flowData,
      rounds: roundsWithCalculatedDurations
    } : flowData;

    const response = await mockClient.patch(`/api/flows/${id}/`, payload);
    return response.data;
  },

  publishFlow: async (id) => {
    const response = await mockClient.post(`/api/flows/${id}/publish/`);
    // Wait, the publish API might just return status, let's fetch the updated flow
    const getResp = await mockClient.get(`/api/flows/${id}/`);
    return getResp.data;
  },

  deleteFlow: async (id) => {
    await mockClient.delete(`/api/flows/${id}/`);
    return true;
  },

  generateQuestions: async (payload) => {
    const response = await mockClient.post('/api/flows/generate-questions/', payload);
    return response.data;
  }
};

export default flowService;
