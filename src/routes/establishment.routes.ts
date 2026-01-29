// backend/src/routes/establishment.routes.ts
import express from 'express';
import {
  getEstablishments,
  getEstablishmentById,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
  searchEstablishments,
  getEstablishmentStats,
  importEstablishmentsBatch,
  getLocations
} from '../controllers/establishment.controller';

const router = express.Router();

// Routes publiques
router.get('/', getEstablishments);
router.get('/stats', getEstablishmentStats);
router.get('/locations', getLocations);
router.get('/search/:keyword', searchEstablishments);
router.get('/:id', getEstablishmentById);

// Routes protégées (pour admin)
router.post('/', createEstablishment);
router.put('/:id', updateEstablishment);
router.delete('/:id', deleteEstablishment);
router.post('/batch', importEstablishmentsBatch);

export default router;