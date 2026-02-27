import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: true,
})

// Auth token injection
api.interceptors.request.use(config => {
  const token = localStorage.getItem('lt_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lt_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────
export const authApi = {
  login:          data => api.post('/auth/login', data),
  register:       data => api.post('/auth/register', data),
  logout:         ()   => api.post('/auth/logout'),
  me:             ()   => api.get('/auth/me'),
  updateProfile:  data => api.put('/auth/profile', data),
  forgotPassword: data => api.post('/auth/forgot-password', data),
  resetPassword:  data => api.post('/auth/reset-password', data),
}

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  summary:    ()      => api.get('/dashboard/summary'),
  pipeline:   ()      => api.get('/dashboard/pipeline'),
  activity:   ()      => api.get('/dashboard/activity-feed'),
  alerts:     ()      => api.get('/dashboard/alerts'),
  forecast:   ()      => api.get('/dashboard/forecast'),
  repStats:   ()      => api.get('/dashboard/rep-stats'),
}

// ── Leads ─────────────────────────────────────────────────
export const leadsApi = {
  list:       params  => api.get('/leads', { params }),
  get:        id      => api.get(`/leads/${id}`),
  create:     data    => api.post('/leads', data),
  update:     (id, d) => api.put(`/leads/${id}`, d),
  delete:     id      => api.delete(`/leads/${id}`),
  convert:    (id, d) => api.post(`/leads/${id}/convert`, d),
  score:      id      => api.post(`/leads/${id}/score`),
  stats:      ()      => api.get('/leads/stats'),
  overdue:    p       => api.get('/leads/overdue', { params: p }),
  bulkAssign: data    => api.post('/leads/assign', data),
  import:     file    => { const fd = new FormData(); fd.append('file', file); return api.post('/leads/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
}

// ── Accounts ──────────────────────────────────────────────
export const accountsApi = {
  list:       params  => api.get('/accounts', { params }),
  get:        id      => api.get(`/accounts/${id}`),
  create:     data    => api.post('/accounts', data),
  update:     (id, d) => api.put(`/accounts/${id}`, d),
  delete:     id      => api.delete(`/accounts/${id}`),
  timeline:   id      => api.get(`/accounts/${id}/timeline`),
  health:     id      => api.get(`/accounts/${id}/health`),
  renewals:   ()      => api.get('/accounts/renewals/upcoming'),
  atRisk:     ()      => api.get('/accounts/at-risk'),
}

// ── Contacts ──────────────────────────────────────────────
export const contactsApi = {
  list:       params      => api.get('/contacts', { params }),
  byAccount:  accountId   => api.get(`/accounts/${accountId}/contacts`),
  get:        id          => api.get(`/contacts/${id}`),
  create:     data        => api.post('/contacts', data),
  update:     (id, d)     => api.put(`/contacts/${id}`, d),
  delete:     id          => api.delete(`/contacts/${id}`),
}

// ── Pipeline / Opportunities ───────────────────────────────
export const pipelineApi = {
  kanban:     params  => api.get('/opportunities/kanban', { params }),
  list:       params  => api.get('/opportunities', { params }),
  get:        id      => api.get(`/opportunities/${id}`),
  create:     data    => api.post('/opportunities', data),
  update:     (id, d) => api.put(`/opportunities/${id}`, d),
  delete:     id      => api.delete(`/opportunities/${id}`),
  updateStage:(id, d) => api.patch(`/opportunities/${id}/stage`, d),
  closeWon:   (id, d) => api.patch(`/opportunities/${id}/close-won`, d),
  closeLost:  (id, d) => api.patch(`/opportunities/${id}/close-lost`, d),
  forecast:   params  => api.get('/opportunities/forecast', { params }),
  stuck:      params  => api.get('/opportunities/stuck', { params }),
}

// ── Activities ────────────────────────────────────────────
export const activitiesApi = {
  list:       params  => api.get('/activities', { params }),
  today:      ()      => api.get('/activities/today'),
  overdue:    ()      => api.get('/activities/overdue'),
  get:        id      => api.get(`/activities/${id}`),
  create:     data    => api.post('/activities', data),
  update:     (id, d) => api.put(`/activities/${id}`, d),
  complete:   id      => api.patch(`/activities/${id}/complete`),
  delete:     id      => api.delete(`/activities/${id}`),
}

// ── Campaigns ─────────────────────────────────────────────
export const campaignsApi = {
  list:       params  => api.get('/campaigns', { params }),
  get:        id      => api.get(`/campaigns/${id}`),
  create:     data    => api.post('/campaigns', data),
  update:     (id, d) => api.put(`/campaigns/${id}`, d),
  delete:     id      => api.delete(`/campaigns/${id}`),
  launch:     id      => api.post(`/campaigns/${id}/launch`),
  pause:      id      => api.post(`/campaigns/${id}/pause`),
  stats:      id      => api.get(`/campaigns/${id}/stats`),
}

// ── Estimates ─────────────────────────────────────────────
export const estimatesApi = {
  list:       params  => api.get('/estimates', { params }),
  get:        id      => api.get(`/estimates/${id}`),
  create:     data    => api.post('/estimates', data),
  update:     (id, d) => api.put(`/estimates/${id}`, d),
  delete:     id      => api.delete(`/estimates/${id}`),
  send:       id      => api.post(`/estimates/${id}/send`),
  pdf:        id      => api.post(`/estimates/${id}/pdf`),
  approve:    id      => api.post(`/estimates/${id}/approve`),
  convert:    id      => api.post(`/estimates/${id}/convert`),
  duplicate:  id      => api.post(`/estimates/${id}/duplicate`),
  rateCard:   ()      => api.get('/estimates/rate-card'),
  updateRateCard: d   => api.put('/estimates/rate-card', d),
}

// ── Contracts ─────────────────────────────────────────────
export const contractsApi = {
  list:       params  => api.get('/contracts', { params }),
  get:        id      => api.get(`/contracts/${id}`),
  create:     data    => api.post('/contracts', data),
  update:     (id, d) => api.put(`/contracts/${id}`, d),
  delete:     id      => api.delete(`/contracts/${id}`),
  send:       id      => api.post(`/contracts/${id}/send`),
  pdf:        id      => api.post(`/contracts/${id}/pdf`),
  void:       id      => api.post(`/contracts/${id}/void`),
  amend:      (id, d) => api.post(`/contracts/${id}/amend`, d),
  cancel:     (id, d) => api.post(`/contracts/${id}/cancel`, d),
  renew:      id      => api.post(`/contracts/${id}/renew`),
  expiring:   p       => api.get('/contracts/expiring', { params: p }),
  templates:  ()      => api.get('/contracts/templates'),
}

// ── Reports ───────────────────────────────────────────────
export const reportsApi = {
  salesPerformance: p => api.get('/reports/sales-performance', { params: p }),
  pipelineVelocity: p => api.get('/reports/pipeline-velocity', { params: p }),
  leadConversion:   p => api.get('/reports/lead-conversion', { params: p }),
  revenue:          p => api.get('/reports/revenue', { params: p }),
  campaignRoi:      p => api.get('/reports/campaign-roi', { params: p }),
  repLeaderboard:   p => api.get('/reports/rep-leaderboard', { params: p }),
  export:           d => api.post('/reports/export', d, { responseType: 'blob' }),
}

// ── Users ─────────────────────────────────────────────────
export const usersApi = {
  list:   params  => api.get('/users', { params }),
  get:    id      => api.get(`/users/${id}`),
  create: data    => api.post('/users', data),
  update: (id, d) => api.put(`/users/${id}`, d),
  delete: id      => api.delete(`/users/${id}`),
}

export default api
