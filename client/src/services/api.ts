import type { 
  ApiResponse, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse 
} from "../../server/types/api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class ApiClient {
  private baseURL: string;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '';
    console.log('API Base URL:', this.baseURL);
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
  }

  clearTokens() {
    this.tokens = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.tokens?.accessToken) {
      headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      console.log('API Client: Adding JWT token to headers');
    } else {
      console.log('API Client: No JWT token available for request');
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle the standardized API response format
    if (data.success === false) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    // Return the data property if it exists, otherwise return the whole response
    return data.data !== undefined ? data.data : data;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    console.log('API Client: Making DELETE request to:', endpoint);
    console.log('API Client: Headers:', this.getHeaders());
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    console.log('API Client: DELETE response status:', response.status);
    console.log('API Client: DELETE response ok:', response.ok);

    return this.handleResponse<T>(response);
  }

  // Specialized methods for file uploads
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {};
    if (this.tokens?.accessToken) {
      headers.Authorization = `Bearer ${this.tokens.accessToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; environment: string }> {
    return this.get('/api/health');
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { email, password };
    return this.post('/api/auth/login', loginData);
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    const registerData: RegisterRequest = data;
    return this.post('/api/auth/register', registerData);
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const refreshData: RefreshTokenRequest = { refreshToken };
    return this.post('/api/auth/refresh', refreshData);
  }

  async logout(refreshToken: string): Promise<void> {
    return this.post('/api/auth/logout', { refreshToken });
  }

  async getCurrentUser(): Promise<any> {
    return this.get('/api/auth/me');
  }

  async updateProfile(data: { firstName?: string; lastName?: string }): Promise<any> {
    return this.put('/api/auth/me', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.put('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // CVJ Stages
  async getCvjStages(includeHierarchy = false, includeInactive = false): Promise<any[]> {
    const params = new URLSearchParams();
    if (includeHierarchy) params.append('include_hierarchy', 'true');
    if (includeInactive) params.append('include_inactive', 'true');
    
    const query = params.toString();
    const response = await this.get(`/api/cvj-stages${query ? '?' + query : ''}`);
    
    // If hierarchy was requested but not returned, construct it from separate API calls
    if (includeHierarchy && Array.isArray(response) && response.length > 0 && !response[0].subCategories) {
      console.log('API Client: Hierarchy not returned, constructing from separate calls...');
      
      // Get subcategories and KPIs separately
      const subcategories = await this.get('/api/subcategories');
      const kpis = await this.get('/api/kpis');
      
      // Build hierarchy manually
      const stagesWithHierarchy = response.map(stage => ({
        ...stage,
        subCategories: subcategories
          .filter((sub: any) => sub.cvjStageId === stage.id)
          .map((sub: any) => ({
            ...sub,
            kpis: kpis.filter((kpi: any) => kpi.subCategoryId === sub.id)
          }))
      }));
      
      return stagesWithHierarchy;
    }
    
    return response;
  }

  async getCvjStage(id: string): Promise<any> {
    return this.get(`/api/cvj-stages/${id}`);
  }

  async createCvjStage(data: any): Promise<any> {
    return this.post('/api/cvj-stages', data);
  }

  async updateCvjStage(id: string, data: any): Promise<any> {
    return this.put(`/api/cvj-stages/${id}`, data);
  }

  async deleteCvjStage(id: string): Promise<void> {
    return this.delete(`/api/cvj-stages/${id}`);
  }

  // KPIs
  async getKpis(filters?: {
    stageId?: string;
    subCategoryId?: string;
    active?: boolean;
    includeRelations?: boolean;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.stageId) params.append('stage_id', filters.stageId);
    if (filters?.subCategoryId) params.append('sub_category_id', filters.subCategoryId);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.includeRelations) params.append('include_relations', 'true');
    
    const query = params.toString();
    return this.get(`/api/kpis${query ? '?' + query : ''}`);
  }

  async getKpi(id: string): Promise<any> {
    return this.get(`/api/kpis/${id}`);
  }

  async createKpi(data: any): Promise<any> {
    return this.post('/api/kpis', data);
  }

  async updateKpi(id: string, data: any): Promise<any> {
    return this.put(`/api/kpis/${id}`, data);
  }

  async deleteKpi(id: string): Promise<void> {
    return this.delete(`/api/kpis/${id}`);
  }

  async toggleKpiStatus(id: string): Promise<any> {
    return this.patch(`/api/kpis/${id}/toggle-active`);
  }

  async bulkUpdateKpis(kpiIds: string[], updates: any): Promise<any[]> {
    return this.patch('/api/kpis/bulk-update', { kpiIds, updates });
  }

  // Weekly Data
  async getWeeklyData(filters?: {
    weekId?: string;
    kpiId?: string;
    monthId?: string;
    includeRelations?: boolean;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.weekId) params.append('week_id', filters.weekId);
    if (filters?.kpiId) params.append('kpi_id', filters.kpiId);
    if (filters?.monthId) params.append('month_id', filters.monthId);
    if (filters?.includeRelations) params.append('include_relations', 'true');
    
    const query = params.toString();
    return this.get(`/api/weekly-data${query ? '?' + query : ''}`);
  }

  async getWeeklyDataEntry(id: string): Promise<any> {
    return this.get(`/api/weekly-data/${id}`);
  }

  async createWeeklyDataEntry(data: any): Promise<any> {
    return this.post('/api/weekly-data', data);
  }

  async updateWeeklyDataEntry(id: string, data: any): Promise<any> {
    return this.put(`/api/weekly-data/${id}`, data);
  }

  async deleteWeeklyDataEntry(id: string): Promise<void> {
    return this.delete(`/api/weekly-data/${id}`);
  }

  async bulkUpsertWeeklyData(entries: any[]): Promise<any[]> {
    return this.post('/api/weekly-data/bulk', { entries });
  }

  async getWeeklyDataForWeek(weekId: string): Promise<any> {
    return this.get(`/api/weekly-data/week/${weekId}`);
  }

  async getWeeklyDataForKpi(kpiId: string): Promise<any> {
    return this.get(`/api/weekly-data/kpi/${kpiId}`);
  }

  // Monthly Targets
  async getMonthlyTargets(filters?: {
    kpiId?: string;
    monthId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.kpiId) params.append('kpi_id', filters.kpiId);
    if (filters?.monthId) params.append('month_id', filters.monthId);
    
    const query = params.toString();
    return this.get(`/api/monthly-targets${query ? '?' + query : ''}`);
  }

  async getMonthlyTarget(id: string): Promise<any> {
    return this.get(`/api/monthly-targets/${id}`);
  }

  async createMonthlyTarget(data: any): Promise<any> {
    return this.post('/api/monthly-targets', data);
  }

  async updateMonthlyTarget(id: string, data: any): Promise<any> {
    return this.put(`/api/monthly-targets/${id}`, data);
  }

  async deleteMonthlyTarget(id: string): Promise<void> {
    return this.delete(`/api/monthly-targets/${id}`);
  }

  async bulkUpsertMonthlyTargets(targets: any[]): Promise<any[]> {
    return this.post('/api/monthly-targets/bulk', { targets });
  }

  async getMonthlyTargetsForMonth(monthId: string): Promise<any[]> {
    return this.get(`/api/monthly-targets/month/${monthId}`);
  }

  async getMonthlyTargetsForKpi(kpiId: string): Promise<any> {
    return this.get(`/api/monthly-targets/kpi/${kpiId}`);
  }

  // Analytics and Dashboard
  async getDashboardData(monthId: string): Promise<any> {
    return this.get(`/api/analytics/dashboard/${monthId}`);
  }

  async getMonthlyOverview(monthId?: string, stageId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (monthId) params.append('month', monthId);
    if (stageId) params.append('stage_id', stageId);
    
    const query = params.toString();
    return this.get(`/api/analytics/monthly-overview${query ? '?' + query : ''}`);
  }

  async getTrendData(filters: {
    kpiId?: string;
    stageId?: string;
    dateFrom: string;
    dateTo: string;
    period?: 'weekly' | 'monthly';
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters.kpiId) params.append('kpi_id', filters.kpiId);
    if (filters.stageId) params.append('stage_id', filters.stageId);
    params.append('date_from', filters.dateFrom);
    params.append('date_to', filters.dateTo);
    if (filters.period) params.append('period', filters.period);
    
    return this.get(`/api/analytics/trends?${params.toString()}`);
  }

  async getKpiPerformanceMetrics(filters?: {
    monthId?: string;
    stageId?: string;
    kpiIds?: string[];
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.monthId) params.append('month_id', filters.monthId);
    if (filters?.stageId) params.append('stage_id', filters.stageId);
    if (filters?.kpiIds?.length) params.append('kpi_ids', filters.kpiIds.join(','));
    
    const query = params.toString();
    return this.get(`/api/analytics/kpi-performance${query ? '?' + query : ''}`);
  }

  async getStagePerformanceSummary(monthId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (monthId) params.append('month_id', monthId);
    
    const query = params.toString();
    return this.get(`/api/analytics/stage-performance${query ? '?' + query : ''}`);
  }

  async getComparisonData(filters: {
    currentMonth: string;
    comparisonMonth: string;
    kpiId?: string;
    stageId?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    params.append('current_month', filters.currentMonth);
    params.append('comparison_month', filters.comparisonMonth);
    if (filters.kpiId) params.append('kpi_id', filters.kpiId);
    if (filters.stageId) params.append('stage_id', filters.stageId);
    
    return this.get(`/api/analytics/comparison?${params.toString()}`);
  }

  async getHealthScoreMetrics(monthId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (monthId) params.append('month_id', monthId);
    
    const query = params.toString();
    return this.get(`/api/analytics/health-score${query ? '?' + query : ''}`);
  }

  async exportData(filters: {
    format?: 'json' | 'csv';
    dateFrom: string;
    dateTo: string;
    includeTargets?: boolean;
    stageIds?: string[];
    kpiIds?: string[];
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters.format) params.append('format', filters.format);
    params.append('date_from', filters.dateFrom);
    params.append('date_to', filters.dateTo);
    if (filters.includeTargets !== undefined) params.append('include_targets', filters.includeTargets.toString());
    if (filters.stageIds?.length) params.append('stage_ids', filters.stageIds.join(','));
    if (filters.kpiIds?.length) params.append('kpi_ids', filters.kpiIds.join(','));
    
    return this.get(`/api/analytics/export?${params.toString()}`);
  }

  // Weeks Management
  async getWeeks(): Promise<any[]> {
    return this.get('/api/weeks');
  }

  async createWeek(data: any): Promise<any> {
    return this.post('/api/weeks', data);
  }

  async updateWeek(id: string, data: any): Promise<any> {
    return this.put(`/api/weeks/${id}`, data);
  }

  async deleteWeek(id: string): Promise<void> {
    return this.post(`/api/weeks/${id}/delete`);
  }

  // Subcategories
  async getSubcategories(): Promise<any[]> {
    return this.get('/api/analytics/subcategories');
  }

  async createSubcategory(data: any): Promise<any> {
    return this.post('/api/analytics/subcategories', data);
  }

  async updateSubcategory(id: string, data: any): Promise<any> {
    return this.put(`/api/analytics/subcategories/${id}`, data);
  }

  async deleteSubcategory(id: string): Promise<void> {
    return this.delete(`/api/analytics/subcategories/${id}`);
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };

// Export types for convenience
export type { AuthTokens };
