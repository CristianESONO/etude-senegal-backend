// src/routes/user.routes.ts
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addEstablishmentToFavorites,
  addHousingToFavorites,
  getUserFavorites,
  getUsers
} from '../controllers/user.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Routes publiques
router.post('/register', registerUser);
router.post('/login', loginUser);

// Routes protégées
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/favorites', protect, getUserFavorites);
router.post('/favorites/establishments/:id', protect, addEstablishmentToFavorites);
router.post('/favorites/housing/:id', protect, addHousingToFavorites);

// Routes admin seulement
router.get('/', protect, authorize('admin'), getUsers);

export default router;