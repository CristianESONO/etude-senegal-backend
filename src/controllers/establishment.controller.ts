// backend/src/controllers/establishment.controller.ts
import { Request, Response } from 'express';
import { Establishment } from '../models';

// @desc    Récupérer tous les établissements
// @route   GET /api/establishments
// @access  Public
// backend/src/controllers/establishment.controller.ts - Modifiez la fonction getEstablishments
export const getEstablishments = async (req: Request, res: Response) => {
  try {
    const { type, location, search, page = 1, limit = 12, exclude } = req.query;
    
    // Construction de la requête de filtrage
    const query: any = {};
    
    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Exclure un établissement spécifique si demandé
    if (exclude) {
      query._id = { $ne: exclude };
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Exécution des requêtes
    const [establishments, total] = await Promise.all([
      Establishment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Establishment.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      count: establishments.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: establishments
    });
    
  } catch (error) {
    console.error('Erreur getEstablishments:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des établissements'
    });
  }
};

// @desc    Récupérer un établissement par ID
// @route   GET /api/establishments/:id
// @access  Public
export const getEstablishmentById = async (req: Request, res: Response) => {
  try {
    const establishment = await Establishment.findById(req.params.id);
    
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: establishment
    });
    
  } catch (error) {
    console.error('Erreur getEstablishmentById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Créer un nouvel établissement
// @route   POST /api/establishments
// @access  Private/Admin (pour l'instant public pour le développement)
export const createEstablishment = async (req: Request, res: Response) => {
  try {
    // Validation des données requises
    const requiredFields = ['name', 'type', 'location', 'contact'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs manquants: ${missingFields.join(', ')}`
      });
    }
    
    // Valider l'email
    if (req.body.contact && req.body.contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.contact.email)) {
        return res.status(400).json({
          success: false,
          message: 'Format d\'email invalide'
        });
      }
    }
    
    const establishment = await Establishment.create({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: establishment,
      message: 'Établissement créé avec succès'
    });
    
  } catch (error: any) {
    console.error('Erreur createEstablishment:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Un établissement avec ce nom ou cet email existe déjà'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Données invalides',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Importer plusieurs établissements en batch
// @route   POST /api/establishments/batch
// @access  Private/Admin
export const importEstablishmentsBatch = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    // Validation de base
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Les données doivent être un tableau d\'établissements'
      });
    }

    // Limiter le nombre d'imports par batch
    const MAX_BATCH_SIZE = 100;
    if (items.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_BATCH_SIZE} établissements par import`
      });
    }

    const results = {
      imported: [] as any[],
      errors: [] as string[],
      skipped: [] as string[]
    };

    // Traitement séquentiel pour mieux gérer les erreurs
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineNumber = i + 1;
      
      try {
        // Validation des données requises
        if (!item.name || !item.type || !item.location) {
          results.errors.push(`Ligne ${lineNumber}: Champs requis manquants (nom, type, localisation)`);
          continue;
        }

        // Validation de l'email
        if (!item.contact?.email) {
          results.errors.push(`Ligne ${lineNumber}: Email de contact requis`);
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(item.contact.email)) {
          results.errors.push(`Ligne ${lineNumber}: Format d'email invalide`);
          continue;
        }

        // Vérifier si l'établissement existe déjà
        const existing = await Establishment.findOne({
          $or: [
            { name: item.name.trim() },
            { 'contact.email': item.contact.email.toLowerCase() }
          ]
        });

        if (existing) {
          results.skipped.push(`Ligne ${lineNumber}: "${item.name}" existe déjà`);
          continue;
        }

        // Préparer les données
        const establishmentData = {
          name: item.name.trim(),
          type: item.type.toLowerCase(),
          location: item.location,
          description: item.description || '',
          studentsCount: item.studentsCount || 0,
          rating: Math.min(5, Math.max(0, item.rating || 0)), // Limiter entre 0 et 5
          isCAMESRecognized: Boolean(item.isCAMESRecognized),
          programs: Array.isArray(item.programs) 
            ? item.programs.map((p: string) => p.toString().trim()).filter(Boolean)
            : [],
          images: Array.isArray(item.images) ? item.images : [],
          contact: {
            email: item.contact.email.toLowerCase().trim(),
            phone: item.contact.phone?.toString().trim() || '',
            website: item.contact.website?.toString().trim() || ''
          },
          coordinates: item.coordinates || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Vérifier le type
        const validTypes = ['university', 'school', 'institute'];
        if (!validTypes.includes(establishmentData.type)) {
          results.errors.push(`Ligne ${lineNumber}: Type invalide (${validTypes.join(', ')})`);
          continue;
        }

        // Créer l'établissement
        const establishment = await Establishment.create(establishmentData);
        
        results.imported.push({
          id: establishment._id,
          name: establishment.name,
          email: establishment.contact.email
        });

      } catch (error: any) {
        console.error(`Erreur ligne ${lineNumber}:`, error);
        results.errors.push(`Ligne ${lineNumber}: ${error.message || 'Erreur inconnue'}`);
      }
    }

    // Définir l'interface pour le summary
    interface ImportSummary {
      total: number;
      imported: number;
      errors: number;
      skipped: number;
      errorDetails?: string[];
      skippedDetails?: string[];
      importedDetails?: any[];
    }

    // Créer le summary
    const summary: ImportSummary = {
      total: items.length,
      imported: results.imported.length,
      errors: results.errors.length,
      skipped: results.skipped.length
    };

    // Ajouter les détails d'erreur si en mode développement ou si demandé
    const showDetails = process.env.NODE_ENV === 'development' || req.query.details === 'true';
    if (showDetails) {
      if (results.errors.length > 0) {
        summary.errorDetails = results.errors.slice(0, 20); // Limiter à 20 erreurs
      }
      if (results.skipped.length > 0) {
        summary.skippedDetails = results.skipped.slice(0, 20);
      }
      if (results.imported.length > 0 && results.imported.length <= 10) {
        summary.importedDetails = results.imported;
      }
    }

    // Préparer la réponse
    const response = {
      success: true,
      summary: summary,
      message: `Import terminé: ${results.imported.length} établissements importés`
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Erreur importEstablishmentsBatch:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'import batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mettre à jour un établissement
// @route   PUT /api/establishments/:id
// @access  Private/Admin
export const updateEstablishment = async (req: Request, res: Response) => {
  try {
    // Valider l'email si présent
    if (req.body.contact && req.body.contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.contact.email)) {
        return res.status(400).json({
          success: false,
          message: 'Format d\'email invalide'
        });
      }
    }

    const establishment = await Establishment.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: establishment,
      message: 'Établissement mis à jour avec succès'
    });
    
  } catch (error: any) {
    console.error('Erreur updateEstablishment:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Un établissement avec cet email existe déjà'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Supprimer un établissement
// @route   DELETE /api/establishments/:id
// @access  Private/Admin
export const deleteEstablishment = async (req: Request, res: Response) => {
  try {
    const establishment = await Establishment.findByIdAndDelete(req.params.id);
    
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Établissement supprimé avec succès',
      data: {
        id: establishment._id,
        name: establishment.name
      }
    });
    
  } catch (error) {
    console.error('Erreur deleteEstablishment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Rechercher des établissements
// @route   GET /api/establishments/search/:keyword
// @access  Public
export const searchEstablishments = async (req: Request, res: Response) => {
  try {
    const keyword = req.params.keyword;
    
    const establishments = await Establishment.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } },
        { programs: { $regex: keyword, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      count: establishments.length,
      data: establishments
    });
    
  } catch (error) {
    console.error('Erreur searchEstablishments:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche'
    });
  }
};

// @desc    Récupérer les statistiques des établissements
// @route   GET /api/establishments/stats
// @access  Public
export const getEstablishmentStats = async (req: Request, res: Response) => {
  try {
    const stats = await Establishment.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgStudents: { $avg: '$studentsCount' },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $group: {
          _id: null,
          totalEstablishments: { $sum: '$count' },
          types: { $push: { type: '$_id', count: '$count' } },
          avgStudentsOverall: { $avg: '$avgStudents' },
          avgRatingOverall: { $avg: '$avgRating' }
        }
      }
    ]);
    
    const locationStats = await Establishment.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const camesStats = await Establishment.aggregate([
      { $group: { _id: '$isCAMESRecognized', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        stats: stats[0] || { totalEstablishments: 0, types: [], avgStudentsOverall: 0, avgRatingOverall: 0 },
        popularLocations: locationStats,
        camesRecognition: camesStats
      }
    });
    
  } catch (error) {
    console.error('Erreur getEstablishmentStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du calcul des statistiques'
    });
  }
};

// @desc    Récupérer les emplacements uniques
// @route   GET /api/establishments/locations
// @access  Public
export const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await Establishment.distinct('location');
    
    res.json({
      success: true,
      data: locations.sort()
    });
    
  } catch (error) {
    console.error('Erreur getLocations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des localisations'
    });
  }
};