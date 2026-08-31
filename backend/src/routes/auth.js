import { Router } from 'express';

import {
  validateSessionAndGetProfile
} from '../controllers/authController.js';

import {
  onboardNewProfile
} from '../controllers/onboardingController.js';

const router = Router();

// POST /api/auth/
// Validates a Supabase JWT and returns the user's workspace profile.
router.post('/', validateSessionAndGetProfile);

// POST /api/auth/signup
// Public onboarding endpoint for new profile registration.
router.post('/signup', onboardNewProfile);

export default router;