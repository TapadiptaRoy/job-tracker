export type Status = 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'GHOSTED' | 'SELECTED'

export interface User {
  id: string
  name: string
  email: string
}

export interface Activity {
  id: string
  type: string
  description: string
  createdAt: string
  applicationId: string
}

export interface Application {
  id: string
  company: string
  role: string
  status: Status
  appliedDate: string
  followUpDate?: string    // ← add this line
  notes?: string
  jobUrl?: string
  salary?: string
  location?: string
  createdAt: string
  updatedAt: string
  userId: string
  activities?: Activity[]
}

export interface Stats {
  total: number
  applied: number
  interview: number
  offer: number
  rejected: number
  ghosted: number
  responseRate: number
}
