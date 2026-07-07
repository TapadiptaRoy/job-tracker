import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
}

const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
}

// REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    })

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    res.status(201).json({
      message: 'User created successfully',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('REGISTER ERROR:', error)
    res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

// LOGOUT
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' })
    }

    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('LOGOUT ERROR:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// REFRESH TOKEN
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' })
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    const accessToken = generateAccessToken(payload.userId)

    res.json({ accessToken })
  } catch (error) {
    console.error('REFRESH ERROR:', error)
    res.status(401).json({ message: 'Invalid refresh token' })
  }
}