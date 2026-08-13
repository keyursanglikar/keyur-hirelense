import mockClient from '../api/client';

const INITIAL_SCORECARDS = [
  {
    id: 1,
    tenant: 1,
    name: "Audit & Tax Scorecard",
    version: "v1",
    is_live: true,
    auto_reject_threshold: 50,
    rating_scale: "1-10",
    parameters: [
      { id: 1, scorecard: 1, name: "Domain knowledge", weight: 30, description: JSON.stringify({ maxMarks: 10, mandatory: true }) },
      { id: 2, scorecard: 1, name: "Communication", weight: 20, description: JSON.stringify({ maxMarks: 10, mandatory: true }) },
      { id: 3, scorecard: 1, name: "Problem Solving", weight: 20, description: JSON.stringify({ maxMarks: 10, mandatory: true }) },
      { id: 4, scorecard: 1, name: "Ownership & attitude", weight: 15, description: JSON.stringify({ maxMarks: 10, mandatory: false }) },
      { id: 5, scorecard: 1, name: "Culture Fit", weight: 15, description: JSON.stringify({ maxMarks: 10, mandatory: false }) }
    ],
    // Frontend UI extra metadata fields
    jobTitle: "Audit & Tax Executive",
    department: "Audit & Tax",
    description: "Core evaluation criteria for senior tax and audit roles."
  },
  {
    id: 2,
    tenant: 1,
    name: "Articleship Scorecard",
    version: "v1",
    is_live: true,
    auto_reject_threshold: 50,
    rating_scale: "1-10",
    parameters: [
      { id: 6, scorecard: 2, name: "Fundamentals", weight: 35, description: JSON.stringify({ maxMarks: 10, mandatory: true }) },
      { id: 7, scorecard: 2, name: "Learning attitude", weight: 25, description: JSON.stringify({ maxMarks: 10, mandatory: true }) },
      { id: 8, scorecard: 2, name: "Communication", weight: 20, description: JSON.stringify({ maxMarks: 10, mandatory: false }) },
      { id: 9, scorecard: 2, name: "Culture Fit", weight: 20, description: JSON.stringify({ maxMarks: 10, mandatory: false }) }
    ],
    jobTitle: "Article Assistant",
    department: "Audit",
    description: "CA articleship screening scorecard."
  }
];

const getStoredScorecards = () => {
  const stored = localStorage.getItem('hl_scorecards');
  if (!stored) {
    localStorage.setItem('hl_scorecards', JSON.stringify(INITIAL_SCORECARDS));
    return INITIAL_SCORECARDS;
  }
  return JSON.parse(stored);
};

const saveStoredScorecards = (scorecards) => {
  localStorage.setItem('hl_scorecards', JSON.stringify(scorecards));
};

export const scorecardService = {
  getScorecards: async () => {
    const response = await mockClient.get('/api/scorecards/');
    const list = response.data || [];
    
    // Format to make it easy for UI (mapping parameters to criteria list)
    return list.map(sc => {
      const criteria = (sc.parameters || []).map(p => {
        let meta = { maxMarks: 10, mandatory: false };
        try {
          meta = p.description ? JSON.parse(p.description) : meta;
        } catch (e) {}
        return {
          name: p.name,
          weight: p.weight,
          maxMarks: meta.maxMarks || 10,
          mandatory: meta.mandatory || false
        };
      });
      return {
        ...sc,
        criteria
      };
    });
  },

  getScorecardById: async (id) => {
    const response = await mockClient.get(`/api/scorecards/${id}/`);
    const sc = response.data;
    
    const criteria = (sc.parameters || []).map(p => {
      let meta = { maxMarks: 10, mandatory: false };
      try {
        meta = p.description ? JSON.parse(p.description) : meta;
      } catch (e) {}
      return {
        name: p.name,
        weight: p.weight,
        maxMarks: meta.maxMarks || 10,
        mandatory: meta.mandatory || false
      };
    });

    return {
      ...sc,
      criteria
    };
  },

  createScorecard: async (scData) => {
    // We need to map `criteria` back to `parameters` for the backend
    const payload = {
      ...scData,
      parameters: (scData.criteria || []).map((c) => ({
        name: c.name,
        weight: c.weight,
        description: JSON.stringify({ maxMarks: c.maxMarks || 10, mandatory: c.mandatory || false })
      }))
    };
    const response = await mockClient.post('/api/scorecards/', payload);
    const dbSc = response.data;
    
    return {
      ...dbSc,
      criteria: scData.criteria || []
    };
  },

  updateScorecard: async (id, scData) => {
    // Map `criteria` back to `parameters` for backend payload
    const payload = {
      ...scData,
      parameters: scData.criteria ? scData.criteria.map((c) => ({
        name: c.name,
        weight: c.weight,
        description: JSON.stringify({ maxMarks: c.maxMarks || 10, mandatory: c.mandatory || false })
      })) : undefined
    };
    
    const response = await mockClient.patch(`/api/scorecards/${id}/`, payload);
    const updated = response.data;
    
    const criteria = (updated.parameters || []).map(p => {
      let meta = { maxMarks: 10, mandatory: false };
      try {
        meta = p.description ? JSON.parse(p.description) : meta;
      } catch (e) {}
      return {
        name: p.name,
        weight: p.weight,
        maxMarks: meta.maxMarks || 10,
        mandatory: meta.mandatory || false
      };
    });

    return {
      ...updated,
      criteria
    };
  },

  deleteScorecard: async (id) => {
    await mockClient.delete(`/api/scorecards/${id}/`);
    return true;
  }
};

export default scorecardService;
