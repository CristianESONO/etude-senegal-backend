// src/config/database.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Variable globale pour GridFS
let gfs: any;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log(`🔄 Tentative de connexion MongoDB (${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS})...`);
    
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 30000, // 30 secondes
      socketTimeoutMS: 45000, // 45 secondes
      maxPoolSize: 10,
      retryWrites: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.db?.databaseName || 'N/A'}`);
    console.log(`👥 Connexions actives: ${conn.connection.readyState === 1 ? 'Connecté' : 'Non connecté'}`);
    
    connectionAttempts = 0; // Réinitialiser les tentatives après succès
    
    // Initialiser GridFS après connexion réussie
    initGridFS();
    
  } catch (error) {
    connectionAttempts++;
    
    console.error(`❌ Erreur de connexion MongoDB (tentative ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`);
    
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      
      // Détection d'erreurs spécifiques
      if (error.message.includes('ENOTFOUND')) {
        console.error('   📌 Problème de DNS - Vérifiez votre URI MongoDB');
      } else if (error.message.includes('ETIMEDOUT')) {
        console.error('   📌 Timeout - Vérifiez votre connexion internet');
      } else if (error.message.includes('MongooseServerSelectionError')) {
        console.error('   📌 Impossible de se connecter au cluster MongoDB');
        console.error('   💡 Vérifiez:');
        console.error('      1. Votre IP est autorisée dans MongoDB Atlas');
        console.error('      2. Votre URI de connexion est correcte');
        console.error('      3. Vos identifiants sont valides');
      }
    }
    
    // Stratégie de reconnexion exponentielle
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Maximum 30 secondes
      console.log(`   ⏳ Nouvelle tentative dans ${delay / 1000} secondes...`);
      
      setTimeout(connectDB, delay);
    } else {
      console.error('   ❌ Nombre maximum de tentatives atteint');
      
      // En production, on continue sans MongoDB
      if (process.env.NODE_ENV === 'production') {
        console.log('   ⚠️ Mode dégradé: L\'API fonctionnera sans base de données');
        // L'API continuera de fonctionner avec des données mockées
      } else {
        console.log('   💻 Développement: Arrêt du serveur');
        process.exit(1);
      }
    }
  }
};

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
export const getGridFS = () => {
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
export const isConnected = () => {
  const status = mongoose.connection.readyState === 1;
  if (!status && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ MongoDB non connecté - Mode dégradé activé');
  }
  return status;
};

// Obtenir l'état de la connexion
export const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    status: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    database: mongoose.connection.db?.databaseName,
    models: Object.keys(mongoose.connection.models)
  };
};

// Événements de connexion
mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur de connexion MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Déconnecté de MongoDB');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('   ⏳ Tentative de reconnexion automatique...');
    setTimeout(connectDB, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Reconnecté à MongoDB');
  // Réinitialiser GridFS après reconnexion
  initGridFS();
});

mongoose.connection.on('connecting', () => {
  console.log('🔗 Connexion à MongoDB en cours...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connecté à MongoDB');
});

// Fermeture propre à la terminaison
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

export default connectDB;