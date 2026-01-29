// src/controllers/housing.controller.ts
import { Request, Response } from 'express';
import { Housing } from '../models';

// @desc    Récupérer tous les logements
// @route   GET /api/housing
// @access  Public
export const getAllHousing = async (req: Request, res: Response) => {
  try {
    const { 
      type, 
      location, 
      minPrice, 
      maxPrice, 
      bedrooms,
      available,
      page = 1, 
      limit = 12,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;
    
    // Construction de la requête de filtrage
    const query: any = {};
    
    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (available !== undefined) {
      query.isAvailable = available === 'true';
    }
    
    // Options de tri
    const sortOptions: any = {};
    sortOptions[sort as string] = order === 'asc' ? 1 : -1;
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Exécution des requêtes
    const [housing, total, minPriceResult, maxPriceResult] = await Promise.all([
      Housing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Housing.countDocuments(query),
      Housing.findOne().sort({ price: 1 }).select('price'),
      Housing.findOne().sort({ price: -1 }).select('price')
    ]);
    
    res.json({
      success: true,
      count: housing.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      priceRange: {
        min: minPriceResult?.price || 0,
        max: maxPriceResult?.price || 0
      },
      filters: {
        types: await Housing.distinct('type'),
        locations: await Housing.distinct('location'),
        bedroomOptions: await Housing.distinct('bedrooms')
      },
      data: housing
    });
    
  } catch (error) {
    console.error('Erreur getAllHousing:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des logements'
    });
  }
};

// @desc    Récupérer un logement par ID
// @route   GET /api/housing/:id
// @access  Public
export const getHousingById = async (req: Request, res: Response) => {
  try {
    const housing = await Housing.findById(req.params.id);
    
    if (!housing) {
      return res.status(404).json({
        success: false,
        message: 'Logement non trouvé'
      });
    }
    
    // Suggestions similaires
    const similarHousing = await Housing.find({
      _id: { $ne: housing._id },
      location: housing.location,
      type: housing.type,
      isAvailable: true
    }).limit(4);
    
    res.json({
      success: true,
      data: {
        ...housing.toObject(),
        similar: similarHousing
      }
    });
    
  } catch (error) {
    console.error('Erreur getHousingById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Créer un nouveau logement
// @route   POST /api/housing
// @access  Private/Landlord ou Admin
export const createHousing = async (req: Request, res: Response) => {
  try {
    // Validation des données minimales
    const requiredFields = ['title', 'description', 'type', 'location', 'price', 'bedrooms', 'bathrooms'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs manquants: ${missingFields.join(', ')}`
      });
    }
    
    // Ajout des valeurs par défaut
    const housingData = {
      ...req.body,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      features: {
        hasFurniture: req.body.features?.hasFurniture || false,
        hasInternet: req.body.features?.hasInternet || false,
        hasKitchen: req.body.features?.hasKitchen || false,
        hasParking: req.body.features?.hasParking || false,
        hasSecurity: req.body.features?.hasSecurity || false
      }
    };
    
    const housing = await Housing.create(housingData);
    
    res.status(201).json({
      success: true,
      data: housing
    });
    
  } catch (error: any) {
    console.error('Erreur createHousing:', error);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du logement'
    });
  }
};

// @desc    Mettre à jour un logement
// @route   PUT /api/housing/:id
// @access  Private/Landlord ou Admin
export const updateHousing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'ID n'est pas "undefined"
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID de logement invalide'
      });
    }
    
    // Valider l'email du contact si présent
    if (req.body.contact && req.body.contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.contact.email)) {
        return res.status(400).json({
          success: false,
          message: 'Format d\'email invalide'
        });
      }
    }
    
    const housing = await Housing.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    
    if (!housing) {
      return res.status(404).json({
        success: false,
        message: 'Logement non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: housing
    });
    
  } catch (error: any) {
    console.error('Erreur updateHousing:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

// @desc    Supprimer un logement
// @route   DELETE /api/housing/:id
// @access  Private/Landlord ou Admin
export const deleteHousing = async (req: Request, res: Response) => {
  try {
    const housing = await Housing.findByIdAndDelete(req.params.id);
    
    if (!housing) {
      return res.status(404).json({
        success: false,
        message: 'Logement non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Logement supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur deleteHousing:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Rechercher des logements
// @route   GET /api/housing/search/:keyword
// @access  Public
export const searchHousing = async (req: Request, res: Response) => {
  try {
    const keyword = req.params.keyword;
    
    const housing = await Housing.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } },
        { neighborhood: { $regex: keyword, $options: 'i' } },
        { amenities: { $regex: keyword, $options: 'i' } }
      ],
      isAvailable: true
    }).limit(20);
    
    res.json({
      success: true,
      count: housing.length,
      data: housing
    });
    
  } catch (error) {
    console.error('Erreur searchHousing:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche'
    });
  }
};

// @desc    Marquer un logement comme disponible/indisponible
// @route   PATCH /api/housing/:id/availability
// @access  Private/Landlord ou Admin
export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const { isAvailable } = req.body;
    
    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le champ isAvailable est requis'
      });
    }
    
    const housing = await Housing.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    );
    
    if (!housing) {
      return res.status(404).json({
        success: false,
        message: 'Logement non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: housing,
      message: `Logement marqué comme ${isAvailable ? 'disponible' : 'indisponible'}`
    });
    
  } catch (error) {
    console.error('Erreur updateAvailability:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Récupérer les statistiques des logements
// @route   GET /api/housing/stats
// @access  Public
export const getHousingStats = async (req: Request, res: Response) => {
  try {
    const [totalStats, typeStats, locationStats, bedroomStats, amenitiesStats] = await Promise.all([
      // Statistiques totales
      Housing.aggregate([{
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAvailable: { $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] } },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }]),
      // Par type
      Housing.aggregate([{
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          availableCount: { $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] } },
          avgPrice: { $avg: '$price' }
        }
      }]),
      // Par localisation (top 10)
      Housing.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // Par nombre de chambres
      Housing.aggregate([
        { $group: { _id: '$bedrooms', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
        { $sort: { _id: 1 } }
      ]),
      // Équipements les plus populaires (top 5)
      Housing.aggregate([
        { $unwind: '$amenities' },
        { $group: { _id: '$amenities', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalStats[0] || {
          total: 0, totalAvailable: 0, avgPrice: 0, minPrice: 0, maxPrice: 0
        },
        byType: typeStats,
        byLocation: locationStats,
        byBedrooms: bedroomStats,
        popularAmenities: amenitiesStats,
        lastUpdated: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erreur getHousingStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du calcul des statistiques'
    });
  }
};

// @desc    Récupérer les logements par type
// @route   GET /api/housing/type/:type
// @access  Public
export const getHousingByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit = 6 } = req.query;
    
    const validTypes = ['studio', 'colocation', 'university', 'apartment'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type invalide. Types valides: ${validTypes.join(', ')}`
      });
    }
    
    const housing = await Housing.find({ 
      type,
      isAvailable: true 
    })
    .sort({ createdAt: -1 })
    .limit(Number(limit));
    
    const typeStats = await Housing.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);
    
    res.json({
      success: true,
      type,
      count: housing.length,
      stats: typeStats[0] || { count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 },
      data: housing
    });
    
  } catch (error) {
    console.error('Erreur getHousingByType:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};