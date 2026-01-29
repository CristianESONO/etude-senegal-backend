// src/config/database.ts - Version corrigée
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Variable globale pour GridFS
let gfs: any = null; // Initialisez à null
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Initialiser GridFS
const initGridFS = () => {
  try {
    if (mongoose.connection.db) {
      gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'housing_images'
      });
      console.log('✅ GridFS initialisé avec succès');
    } else {
      console.warn('⚠️ Impossible d\'initialiser GridFS: connexion DB non disponible');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de GridFS:', error);
  }
};

// Récupérer l'instance GridFS
const getGridFS = () => {
  if (!gfs) {
    console.warn('⚠️ Tentative d\'accès à GridFS non initialisé');
    
    if (process.env.NODE_ENV === 'production') {
      // En production, on retourne une instance mockée
      console.log('   📌 Retour d\'une instance GridFS mockée');
      return {
        openUploadStream: () => ({ 
          on: () => {}, 
          end: () => console.log('GridFS mock: Upload simulé') 
        }),
        find: () => ({ toArray: () => Promise.resolve([]) }),
        openDownloadStream: () => ({ 
          pipe: () => console.log('GridFS mock: Téléchargement simulé') 
        }),
        delete: () => Promise.resolve()
      };
    } else {
      throw new Error('GridFS non initialisé. Assurez-vous que la connexion MongoDB est établie.');
    }
  }
  return gfs;
};

// Vérifier si MongoDB est connecté
const isConnected = () => {
  const status = mongoose.connection.readyState === 1;
  if (!status && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ MongoDB non connecté - Mode dégradé activé');
  }
  return status;
};

// Obtenir l'état de la connexion
const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    status: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    database: mongoose.connection.db?.databaseName,
    models: Object.keys(mongoose.connection.models)
  };
};

// Fonction principale de connexion
const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log(`🔄 Tentative de connexion MongoDB (${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS})...`);
    
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.db?.databaseName || 'N/A'}`);
    
    connectionAttempts = 0;
    
    // Initialiser GridFS après connexion réussie
    initGridFS();
    
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ Erreur de connexion MongoDB (tentative ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`, error);
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      console.log(`⏳ Nouvelle tentative dans ${delay / 1000} secondes...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
  }
};

// Événements de connexion
mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur de connexion MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Déconnecté de MongoDB');
  if (process.env.NODE_ENV === 'production') {
    setTimeout(connectDB, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Reconnecté à MongoDB');
  initGridFS();
});

mongoose.connection.on('connecting', () => {
  console.log('🔗 Connexion à MongoDB en cours...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connecté à MongoDB');
});

// Fermeture propre
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('👋 Connexion MongoDB fermée proprement');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de MongoDB:', error);
    process.exit(1);
  }
});

// Exportations
export default connectDB;
export { getGridFS, isConnected, getConnectionStatus };