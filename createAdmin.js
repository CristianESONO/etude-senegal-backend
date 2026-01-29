// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Modèle User (simplifié pour le script)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  phone: { type: String },
  favorites: {
    establishments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Establishment' }],
    housing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Housing' }]
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@etudesenegal.sn' });
    
    if (existingAdmin) {
      console.log('⚠️  L\'admin existe déjà. Suppression...');
      await User.deleteOne({ email: 'admin@etudesenegal.sn' });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    // Créer l'utilisateur admin
    const adminUser = await User.create({
      email: 'admin@etudesenegal.sn',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: 'admin',
      phone: '+221 77 123 45 67'
    });

    console.log('✅ Admin créé avec succès !');
    console.log('📋 Informations de connexion :');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Mot de passe: Admin123!');
    console.log('👤 Nom:', adminUser.firstName, adminUser.lastName);
    console.log('🎯 Rôle:', adminUser.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createAdminUser();