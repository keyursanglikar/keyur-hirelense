import mockClient from '../api/client';

export const openingService = {
  getOpenings: async () => {
    try {
      const response = await mockClient.get('/api/openings/');
      const rawList = response.data || [];
      
      // Parse meta_info for frontend usage so the UI is easy to write
      return rawList.map(op => {
        let metaParsed = {};
        try {
          metaParsed = op.meta_info ? JSON.parse(op.meta_info) : {};
        } catch (e) {
          console.error("Failed to parse opening meta_info", e);
        }
        return {
          ...op,
          ...metaParsed,
          // Keep meta_info raw just in case
          meta_info: op.meta_info,
          // Compute UI meta display string
          meta: `${metaParsed.location || 'Remote'} · ${metaParsed.employment_type || 'Full-time'} · ${metaParsed.experience || 'Any'} · posted ${new Date(op.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
        };
      });
    } catch (e) {
      console.error("Failed to fetch openings from API:", e);
      return [];
    }
  },

  getOpeningById: async (id) => {
    try {
      const response = await mockClient.get(`/api/openings/${id}/`);
      const op = response.data;
      
      let metaParsed = {};
      try {
        metaParsed = op.meta_info ? JSON.parse(op.meta_info) : {};
      } catch (e) {}
      
      return {
        ...op,
        ...metaParsed,
        meta: `${metaParsed.location || 'Remote'} · ${metaParsed.employment_type || 'Full-time'} · ${metaParsed.experience || 'Any'}`
      };
    } catch (e) {
      console.error(`Failed to fetch opening ${id} from API:`, e);
      throw e;
    }
  },

  createOpening: async (openingData) => {
    // Separate django model fields from frontend UI meta fields
    const { title, status, flow, scorecard, tenant, ...metaFields } = openingData;
    
    const newOpening = {
      tenant: tenant || 1,
      title: title || 'New Position',
      status: status || 'Draft',
      meta_info: JSON.stringify({
        description: metaFields.description || '',
        department: metaFields.department || 'General',
        employment_type: metaFields.employment_type || 'Full-time',
        experience: metaFields.experience || 'Entry level',
        location: metaFields.location || 'Remote',
        salary: metaFields.salary || 'Not specified',
        hiring_manager: metaFields.hiring_manager || '',
        invited: 0,
        completed: 0,
        shortlisted: 0
      }),
      flow: flow || null,
      scorecard: scorecard || null,
    };
    
    const response = await mockClient.post('/api/openings/', newOpening);
    const dbOpening = response.data;
    
    return {
      ...dbOpening,
      ...JSON.parse(dbOpening.meta_info || "{}"),
      meta: `${metaFields.location || 'Remote'} · ${metaFields.employment_type || 'Full-time'} · ${metaFields.experience || 'Entry level'}`
    };
  },

  updateOpening: async (id, openingData) => {
    const { title, status, flow, scorecard, tenant, ...metaFields } = openingData;
    
    // First fetch the existing opening to merge meta_info correctly
    const existingRes = await mockClient.get(`/api/openings/${id}/`);
    const current = existingRes.data;
    
    let currentMeta = {};
    try {
      currentMeta = current.meta_info ? JSON.parse(current.meta_info) : {};
    } catch (e) {}

    const updatePayload = {
      title: title !== undefined ? title : current.title,
      status: status !== undefined ? status : current.status,
      flow: flow !== undefined ? flow : current.flow,
      scorecard: scorecard !== undefined ? scorecard : current.scorecard,
      meta_info: JSON.stringify({
        ...currentMeta,
        ...metaFields
      })
    };
    
    if (tenant) updatePayload.tenant = tenant;

    const response = await mockClient.patch(`/api/openings/${id}/`, updatePayload);
    const updated = response.data;
    
    return {
      ...updated,
      ...JSON.parse(updated.meta_info || "{}")
    };
  },

  deleteOpening: async (id) => {
    await mockClient.delete(`/api/openings/${id}/`);
    return true;
  }
};

export default openingService;
