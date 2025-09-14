const User = require('../models/User');

const createSuperAdmin = async () => {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

    if (!superAdminEmail || !superAdminPassword) {
      console.log('⚠️  Super admin credentials not found in environment variables');
      return;
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      $or: [
        { email: superAdminEmail },
        { role: 'superadmin' }
      ]
    });

    if (existingSuperAdmin) {
      console.log('✅ Super admin already exists');
      return existingSuperAdmin;
    }

    // Create super admin
    const superAdmin = await User.create({
      name: superAdminName,
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'superadmin',
      isActive: true
    });

    console.log('🎉 Super admin created successfully:', superAdmin.email);
    return superAdmin;

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    throw error;
  }
};

module.exports = createSuperAdmin;
