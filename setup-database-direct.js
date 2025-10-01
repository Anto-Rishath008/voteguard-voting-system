#!/usr/bin/env node

/**
 * Direct PostgreSQL Database Setup for VoteGuard
 * Uses DATABASE_URL directly instead of Supabase client
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  console.log('🚀 Starting VoteGuard Database Setup...');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log('⏭️  Skipping database setup - DATABASE_URL not configured');
    return;
  }

  console.log('🔌 Connecting to PostgreSQL database...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful!');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📄 Creating database schema...');
      
      const createSchema = `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- 1. USERS TABLE
        CREATE TABLE IF NOT EXISTS users (
            user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
            password_hash VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 2. USER ROLES TABLE  
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
            role VARCHAR(20) CHECK (role IN ('voter', 'admin', 'super_admin')) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (user_id, role)
        );

        -- 3. ELECTIONS TABLE
        CREATE TABLE IF NOT EXISTS elections (
            election_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            election_name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) CHECK (status IN ('Draft', 'Active', 'Completed')) DEFAULT 'Draft',
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 4. VOTES TABLE
        CREATE TABLE IF NOT EXISTS votes (
            vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            election_id UUID REFERENCES elections(election_id),
            user_id UUID REFERENCES users(user_id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      await client.query(createSchema);
      console.log('✅ Database schema created successfully!');
    } else {
      console.log('✅ Database schema already exists!');
    }

    // Check for test users
    const existingUsers = await client.query(`
      SELECT email FROM users 
      WHERE email IN ('voter@voteguard.com', 'admin@voteguard.com', 'superadmin@voteguard.com')
    `);

    if (existingUsers.rows.length === 0) {
      console.log('👤 Creating test users with passwords...');
      
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      // Insert test users
      await client.query(`
        INSERT INTO users (email, first_name, last_name, status, password_hash) VALUES
        ('voter@voteguard.com', 'Test', 'Voter', 'Active', $1),
        ('admin@voteguard.com', 'Test', 'Admin', 'Active', $1),
        ('superadmin@voteguard.com', 'Test', 'SuperAdmin', 'Active', $1)
      `, [hashedPassword]);

      // Get the inserted user IDs
      const insertedUsers = await client.query(`
        SELECT user_id, email FROM users 
        WHERE email IN ('voter@voteguard.com', 'admin@voteguard.com', 'superadmin@voteguard.com')
      `);

      // Insert user roles
      for (const user of insertedUsers.rows) {
        let role = 'voter';
        if (user.email === 'admin@voteguard.com') role = 'admin';
        if (user.email === 'superadmin@voteguard.com') role = 'super_admin';
        
        await client.query(`
          INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
        `, [user.user_id, role]);
      }

      console.log('✅ Test users created with roles!');
      console.log('🔐 Default password for all test users:', defaultPassword);
    } else {
      console.log('👤 Test users already exist:', existingUsers.rows.map(u => u.email).join(', '));
    }

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('⚠️  Continuing deployment despite database setup issues...');
  } finally {
    await client.end();
  }
}

// Run setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup process failed:', error);
      process.exit(0); // Don't fail deployment
    });
}

module.exports = { setupDatabase };