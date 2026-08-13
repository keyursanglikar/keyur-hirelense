import mockClient from '../api/client';

export const authService = {
  login: async (email, password) => {
    // Make real request to Django backend via client connector
    const response = await mockClient.post('/api/users/login/', { email, password });
    const responseData = response.data;
    
    if (responseData && responseData.token) {
      // Save token and user details to sessionStorage
      sessionStorage.setItem('auth_token', responseData.token);
      sessionStorage.setItem('auth_user', JSON.stringify(responseData.user));
      return responseData;
    }
    
    throw new Error('Invalid email or password');
  },

  updateProfile: async (profileData) => {
    // Convert UI field names back to database field naming conventions (flat structure matching serializer definitions)
    const dbPayload = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone_number: profileData.phone,
      address: profileData.address,
      date_of_birth: profileData.dob || null,
      profile_picture: profileData.profile_pic,
      tenant_name: profileData.tenant_name,
      role: profileData.role
    };
    
    const response = await mockClient.patch('/api/users/profile/', dbPayload);
    const updatedData = response.data;
    
    const currentUser = authService.getCurrentUser();
    if (currentUser && updatedData) {
      const mergedUser = {
        ...currentUser,
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        phone: updatedData.phone_number,
        address: updatedData.address,
        dob: updatedData.date_of_birth || '',
        profile_pic: updatedData.profile_picture || '',
        tenant_name: updatedData.tenant_name,
        role: updatedData.role
      };
      sessionStorage.setItem('auth_user', JSON.stringify(mergedUser));
      return mergedUser;
    }
    throw new Error('No user session found');
  },

  changePassword: async (currentPassword, newPassword) => {
    await mockClient.post('/api/users/change-password/', { 
      current_password: currentPassword, 
      new_password: newPassword 
    });
    return true;
  },

  logout: async () => {
    try {
      await mockClient.post('/api/users/logout/');
    } catch (e) {
      // ignore logout errors on mock client fallback
    }
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    return true;
  },

  getCurrentUser: () => {
    const saUser = sessionStorage.getItem('user');
    if (saUser) return JSON.parse(saUser);

    const user = sessionStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!sessionStorage.getItem('access_token') || !!sessionStorage.getItem('auth_token');
  }
};

export default authService;
