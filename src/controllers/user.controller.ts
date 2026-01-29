// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;
    
    // Validation des données
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir tous les champs requis'
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Créer l'utilisateur
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || 'student'
    });
    
    // Créer le token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone
      }
    });
    
  } catch (error: any) {
    console.error('Erreur registerUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
};

// @desc    Connexion utilisateur
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir email et mot de passe'
      });
    }
    
    // Vérifier l'utilisateur
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Créer le token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('Erreur loginUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
};

// @desc    Récupérer le profil utilisateur
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    // req.user.id sera défini par le middleware d'authentification
    const user = await User.findById((req as any).user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Erreur getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Mettre à jour le profil utilisateur
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Erreur updateUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Ajouter un établissement aux favoris
// @route   POST /api/users/favorites/establishments/:id
// @access  Private
export const addEstablishmentToFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const establishmentId = req.params.id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { 'favorites.establishments': establishmentId } },
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Établissement ajouté aux favoris',
      user
    });
    
  } catch (error) {
    console.error('Erreur addEstablishmentToFavorites:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Ajouter un logement aux favoris
// @route   POST /api/users/favorites/housing/:id
// @access  Private
export const addHousingToFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const housingId = req.params.id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { 'favorites.housing': housingId } },
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Logement ajouté aux favoris',
      user
    });
    
  } catch (error) {
    console.error('Erreur addHousingToFavorites:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Récupérer les favoris de l'utilisateur
// @route   GET /api/users/favorites
// @access  Private
export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const user = await User.findById(userId)
      .populate('favorites.establishments')
      .populate('favorites.housing')
      .select('-password');
    
    res.json({
      success: true,
      favorites: user?.favorites || { establishments: [], housing: [] }
    });
    
  } catch (error) {
    console.error('Erreur getUserFavorites:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// @desc    Récupérer tous les utilisateurs (admin seulement)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      success: true,
      count: users.length,
      users
    });
    
  } catch (error) {
    console.error('Erreur getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};