// src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import connectDB from './config/database';

dotenv.config();

const app = express();

// Connexion à MongoDB
connectDB();

// Configuration CORS pour production
const allowedOrigins = [
  'http://localhost:5173',
  'https://etude-senegal.vercel.app',
  'https://etude-senegal-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origine (comme Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ Origine bloquée par CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur l\'API EtudeSénégal',
    version: '1.0.0',
    description: 'API backend pour la plateforme EtudeSénégal',
    endpoints: {
      establishments: '/api/establishments',
      housing: '/api/housing',
      users: '/api/users',
      health: '/api/health'
    },
    timestamp: new Date().toISOString(),
    deployment: process.env.NODE_ENV === 'production' ? 'Render' : 'Local'
  });
});

// Route de test pour Render health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      root: '/',
      api: '/api',
      establishments: '/api/establishments',
      housing: '/api/housing',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

// Gestion des erreurs globales
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur serveur:', err);
  
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

export default app;