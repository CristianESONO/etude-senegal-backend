// src/routes/housing.routes.ts
import express from 'express';
import {
  getAllHousing,
  getHousingById,
  createHousing,
  updateHousing,
  deleteHousing,
  searchHousing,
  updateAvailability,
  getHousingStats,
  getHousingByType
} from '../controllers/housing.controller';

const router = express.Router();

// Routes publiques
router.get('/', getAllHousing);
router.get('/stats', getHousingStats);
router.get('/type/:type', getHousingByType);
router.get('/search/:keyword', searchHousing);
router.get('/:id', getHousingById);

// Routes protégées (pour propriétaires/admin)
router.post('/', createHousing);
router.put('/:id', updateHousing);
router.delete('/:id', deleteHousing);
router.patch('/:id/availability', updateAvailability);

export default router;