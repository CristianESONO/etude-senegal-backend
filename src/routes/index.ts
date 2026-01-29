// src/routes/index.ts
import express from 'express';
import establishmentRoutes from './establishment.routes';
import housingRoutes from './housing.routes';
import userRoutes from './user.routes';
import healthRoutes from './health.routes';

const router = express.Router();

// Routes d'API
router.use('/establishments', establishmentRoutes);
router.use('/housing', housingRoutes);
router.use('/users', userRoutes);
router.use('/', healthRoutes); // Gardez ça ici aussi pour /api/health

export default router;