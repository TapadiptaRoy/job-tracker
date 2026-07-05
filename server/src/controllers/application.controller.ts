import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

// GET ALL
export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query

    const applications = await prisma.application.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status as any }),
        ...(search && {
          OR: [
            { company: { contains: search as string, mode: 'insensitive' } },
            { role: { contains: search as string, mode: 'insensitive' } }
          ]
        })
      },
      include: { activities: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json(applications)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET ONE
export const getApplication = async (req: AuthRequest, res: Response) => {
  try {
    const application = await prisma.application.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
      include: { activities: { orderBy: { createdAt: 'desc' } } }
    })

    if (!application) {
      return res.status(404).json({ message: 'Application not found' })
    }

    res.json(application)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

// CREATE
export const createApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { company, role, status, notes, jobUrl, salary, location } = req.body

    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required' })
    }
    const application = await prisma.application.create({
      data: {
        company,
        role,
        status: status || 'APPLIED',
        notes,
        jobUrl,
        salary,
        location,
        userId: req.userId!
      }
    })
    
    await prisma.activity.create({
      data: {
        type: 'CREATED',
        description: `Applied to ${role} at ${company}`,
        applicationId: application.id
      }
    })

    res.status(201).json(application)
  } catch (error) {
    console.error('CREATE ERROR:', error)
    res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

// UPDATE
export const updateApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { company, role, status, notes, jobUrl, salary, location } = req.body

    const existing = await prisma.application.findFirst({
      where: { id: String(req.params.id), userId: req.userId }
    })

    if (!existing) {
      return res.status(404).json({ message: 'Application not found' })
    }

    const application = await prisma.application.update({
      where: { id: String(req.params.id) },
      data: { company, role, status, notes, jobUrl, salary, location }
    })

    if (status && status !== existing.status) {
      await prisma.activity.create({
        data: {
          type: 'STATUS_CHANGE',
          description: `Status changed from ${existing.status} to ${status}`,
          applicationId: application.id
        }
      })
    }

    res.json(application)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE
export const deleteApplication = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.application.findFirst({
      where: { id: String(req.params.id), userId: req.userId }
    })

    if (!existing) {
      return res.status(404).json({ message: 'Application not found' })
    }

    await prisma.application.delete({ where: { id: String(req.params.id) } })

    res.json({ message: 'Application deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

// STATS
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const [total, applied, interview, offer, rejected, ghosted] = await Promise.all([
      prisma.application.count({ where: { userId: req.userId } }),
      prisma.application.count({ where: { userId: req.userId, status: 'APPLIED' } }),
      prisma.application.count({ where: { userId: req.userId, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { userId: req.userId, status: 'OFFER' } }),
      prisma.application.count({ where: { userId: req.userId, status: 'REJECTED' } }),
      prisma.application.count({ where: { userId: req.userId, status: 'GHOSTED' } }),
    ])

    const responseRate = total > 0 ? Math.round(((interview + offer) / total) * 100) : 0

    res.json({ total, applied, interview, offer, rejected, ghosted, responseRate })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}