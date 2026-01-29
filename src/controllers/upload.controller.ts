// src/controllers/upload.controller.ts - VERSION AVEC TYPES
import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import mongoose from 'mongoose';

// Configuration Multer (stockage en mémoire)
const storage = multer.memoryStorage();

// Définir le type pour MulterRequest avec fichiers
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Fonction de validation de fichier
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seules les images sont acceptées.'));
  }
};

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10 // Max 10 fichiers
  },
  fileFilter
});

// Fonction utilitaire pour obtenir GridFSBucket
const getGridFS = () => {
  if (!mongoose.connection.db) {
    throw new Error('Base de données MongoDB non disponible');
  }
  
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'housing_images'
  });
};

// Type pour les fichiers uploadés
interface UploadedFile {
  fileId: string;
  filename: string;
  url: string;
  originalName: string;
  size: number;
  mimetype: string;
}

// @desc    Uploader une image
// @route   POST /api/upload
// @access  Private
export const uploadImage = [
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const multerReq = req as MulterRequest;
      
      if (!multerReq.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const gfs = getGridFS();
      const file = multerReq.file;
      
      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const filename = `housing_${timestamp}_${random}`;
      const extension = file.mimetype.split('/')[1];
      const fullFilename = `${filename}.${extension}`;

      // Créer un stream d'écriture vers GridFS
      const writeStream = gfs.openUploadStream(fullFilename, {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadDate: new Date(),
          housingId: req.body.housingId || null
        }
      });

      // Retourner une promesse pour gérer l'upload
      return new Promise<void>((resolve, reject) => {
        writeStream.write(file.buffer);
        writeStream.end();

        writeStream.on('finish', () => {
          res.json({
            success: true,
            fileId: writeStream.id.toString(),
            filename: fullFilename,
            url: `/api/upload/${writeStream.id}`,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
          resolve();
        });

        writeStream.on('error', (error: Error) => {
          console.error('Erreur GridFS:', error);
          res.status(500).json({
            success: false,
            message: 'Erreur lors du stockage de l\'image'
          });
          reject(error);
        });
      });

    } catch (error: any) {
      console.error('Erreur upload image:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'upload de l\'image'
      });
    }
  }
];

// @desc    Uploader plusieurs images
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultipleImages = [
  upload.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const multerReq = req as MulterRequest;
      
      if (!multerReq.files || multerReq.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const gfs = getGridFS();
      const files = multerReq.files;
      const uploadedImages: UploadedFile[] = [];

      for (const file of files) {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const filename = `housing_${timestamp}_${random}_${file.originalname}`;
        
        // Créer une promesse pour chaque upload
        const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
          const writeStream = gfs.openUploadStream(filename, {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
              uploadDate: new Date(),
              housingId: req.body.housingId || null
            }
          });

          writeStream.write(file.buffer);
          writeStream.end();
          
          writeStream.on('finish', () => {
            resolve({
              fileId: writeStream.id.toString(),
              filename,
              url: `/api/upload/${writeStream.id}`,
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype
            });
          });
          
          writeStream.on('error', reject);
        });

        uploadedImages.push(await uploadPromise);
      }

      res.json({
        success: true,
        images: uploadedImages,
        count: uploadedImages.length
      });

    } catch (error: any) {
      console.error('Erreur upload multiple images:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'upload des images'
      });
    }
  }
];

// @desc    Récupérer une image par ID
// @route   GET /api/upload/:id
// @access  Public
export const getImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'image invalide'
      });
    }

    const gfs = getGridFS();
    const _id = new mongoose.Types.ObjectId(id);

    // Vérifier si le fichier existe
    const filesCollection = mongoose.connection.db!.collection('housing_images.files');
    const file = await filesCollection.findOne({ _id });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    // Définir le Content-Type approprié
    res.set('Content-Type', file.contentType || 'image/jpeg');
    
    // Stream l'image depuis GridFS
    const downloadStream = gfs.openDownloadStream(_id);
    
    downloadStream.on('error', (error: Error) => {
      console.error('Erreur récupération image:', error);
      res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    });

    downloadStream.pipe(res);

  } catch (error: any) {
    console.error('Erreur getImage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Récupérer les métadonnées d'une image
// @route   GET /api/upload/:id/info
// @access  Public
export const getImageInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'image invalide'
      });
    }

    const _id = new mongoose.Types.ObjectId(id);
    
    if (!mongoose.connection.db) {
      return res.status(500).json({
        success: false,
        message: 'Connexion base de données non disponible'
      });
    }

    const filesCollection = mongoose.connection.db.collection('housing_images.files');
    const file = await filesCollection.findOne({ _id });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    res.json({
      success: true,
      data: {
        _id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
        length: file.length
      }
    });

  } catch (error: any) {
    console.error('Erreur getImageInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Supprimer une image
// @route   DELETE /api/upload/:id
// @access  Private
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'image invalide'
      });
    }

    const gfs = getGridFS();
    const _id = new mongoose.Types.ObjectId(id);
    
    // Vérifier que l'image existe
    const filesCollection = mongoose.connection.db!.collection('housing_images.files');
    const file = await filesCollection.findOne({ _id });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    // Supprimer l'image de GridFS
    await gfs.delete(_id);

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });

  } catch (error: any) {
    console.error('Erreur deleteImage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};