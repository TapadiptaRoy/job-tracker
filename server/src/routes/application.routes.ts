import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats
} from '../controllers/application.controller'

const router = Router()

router.use(authenticate)

router.get('/stats', getStats)
router.get('/', getApplications)
router.get('/:id', getApplication)
router.post('/', createApplication)
router.patch('/:id', updateApplication)
router.delete('/:id', deleteApplication)

export default router