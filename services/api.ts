
// !!! IMPORTANT: REPLACE THIS URL WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL !!!
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQX_J3lCMPd3BItfq9mddWXIFbJyoql4oZNxkxgMUvR4XSMyfOxlz1yUAgF8KTGrFH/exec';

const isMockMode = false;

// Helper to ensure IDs are strings
const normalizeData = (data: any[]) => {
  return data.map(item => ({
    ...item,
    id: item.id ? String(item.id) : '',
    // Ensure other potential number fields are handled if necessary
    phone: item.phone ? String(item.phone) : ''
  }));
};

/**
 * Generic API handler for Google Sheets Backend
 */
export const api = {
  /**
   * Fetch data from a specific sheet
   */
  fetch: async (sheetName: string) => {
    // Check if URL is configured
    if (GOOGLE_SCRIPT_URL.includes('INSERT_YOUR_DEPLOYED')) {
      console.warn(`API: GOOGLE_SCRIPT_URL is not set in services/api.ts. Using Mock Data for ${sheetName}.`);
      return getMockData(sheetName);
    }

    if (isMockMode) {
      return getMockData(sheetName);
    }

    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=read&sheet=${sheetName}`, {
        method: 'GET',
        mode: 'cors', // Ensure CORS is handled
        headers: {
            'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'error') {
          console.error(`API Error (${sheetName}):`, data.message);
          return [];
      }

      return normalizeData(data);
    } catch (error) {
      console.warn(`Connection Failed for ${sheetName}:`, error);
      console.info("Falling back to local mock data (Demo Mode).");
      return getMockData(sheetName); // Fallback to mock data on error so app doesn't break
    }
  },

  /**
   * Create a new row in a sheet
   */
  create: async (sheetName: string, payload: any) => {
    if (GOOGLE_SCRIPT_URL.includes('INSERT_YOUR_DEPLOYED') || isMockMode) {
        console.log(`API (Mock): Created in ${sheetName}`, payload);
        return { status: 'success' };
    }

    try {
      // Use text/plain to avoid OPTIONS preflight request which GAS might not handle well
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', sheet: sheetName, payload })
      });
      return await response.json();
    } catch (error) {
      console.error(`Error creating in ${sheetName}:`, error);
      return { status: 'error', message: 'Network Error' };
    }
  },

  /**
   * Update a row in a sheet
   */
  update: async (sheetName: string, payload: any) => {
    if (GOOGLE_SCRIPT_URL.includes('INSERT_YOUR_DEPLOYED') || isMockMode) {
        console.log(`API (Mock): Updated in ${sheetName}`, payload);
        return { status: 'success' };
    }

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', sheet: sheetName, payload })
      });
      return await response.json();
    } catch (error) {
      console.error(`Error updating in ${sheetName}:`, error);
      return { status: 'error', message: 'Network Error' };
    }
  },

  /**
   * Delete a row from a sheet
   */
  delete: async (sheetName: string, id: string) => {
    if (GOOGLE_SCRIPT_URL.includes('INSERT_YOUR_DEPLOYED') || isMockMode) {
        console.log(`API (Mock): Deleted from ${sheetName}`, id);
        return { status: 'success' };
    }

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', sheet: sheetName, payload: { id } })
      });
      return await response.json();
    } catch (error) {
      console.error(`Error deleting from ${sheetName}:`, error);
      return { status: 'error', message: 'Network Error' };
    }
  },

  /**
   * Upload Photo to Drive (Special Handler)
   */
  uploadPhoto: async (imageData: string, metadata: any) => {
      if (GOOGLE_SCRIPT_URL.includes('INSERT_YOUR_DEPLOYED') || isMockMode) {
          console.log(`API (Mock): Uploaded Photo`, metadata);
          // Return a mock success response
          return { status: 'success' };
      }

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
              action: 'uploadPhoto', 
              sheet: 'Photos', // Context for backend, though handled by function
              payload: { imageData, metadata } 
          })
        });
        return await response.json();
      } catch (error) {
        console.error(`Error uploading photo:`, error);
        return { status: 'error', message: 'Network Error' };
      }
  }
};

// --- Mock Data Fallbacks ---
function getMockData(sheet: string) {
    switch(sheet) {
        case 'Tasks': return [
            { id: '1', title: 'Inspect Safety Equipment (Mock)', description: 'Quarterly inspection', priority: 'High', status: 'Pending', assignedTo: 'Mike Ross', dueDate: '2023-10-28', history: [] },
            { id: '2', title: 'Update Inventory (Mock)', description: 'Sync stock', priority: 'Medium', status: 'In Progress', assignedTo: 'Sarah Smith', dueDate: '2023-10-26', history: [] }
        ];
        case 'Visits': return [
            { id: '1', customerName: 'Apex Industries (Mock)', address: '123 Tech Park', date: '2023-10-25 10:00 AM', status: 'Scheduled', assignedTo: 'John Doe' }
        ];
        case 'Leads': return [
            { id: '1', company: 'TechNova (Mock)', contactPerson: 'Alice', email: 'alice@test.com', phone: '1234567890', status: 'New', potentialValue: 50000 }
        ];
        case 'Orders': return [];
        case 'Expenses': return [];
        case 'Photos': return [];
        case 'Users': return [
             // Default mock users to allow login if backend fails
             { id: '1', name: 'Alex Admin', email: 'admin@fieldforce.com', role: 'Admin', avatar: 'https://ui-avatars.com/api/?name=Admin', password: 'password' },
             { id: '2', name: 'Sarah HR', email: 'hr@fieldforce.com', role: 'HR', avatar: 'https://ui-avatars.com/api/?name=HR', password: 'password' },
             { id: '3', name: 'Mike Field', email: 'employee@fieldforce.com', role: 'Employee', avatar: 'https://ui-avatars.com/api/?name=Employee', password: 'password' }
        ];
        default: return [];
    }
}