import { Request, Response } from 'express';
import mongoose from 'mongoose';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    
    const status = {
      status: 'ok',
      message: 'API EtudeSénégal opérationnelle',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      nodeVersion: process.version,
      database: {
        status: dbStatus === 1 ? 'connected' : 'disconnected',
        readyState: dbStatus
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      }
    };
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur de santé',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};