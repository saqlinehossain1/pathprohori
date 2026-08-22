import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';

export const seedDemoUsers = async () => {
  try {
    const userSeedList = [
      {
        name: 'Md Saqline Hossain',
        email: 'saqline.hossain@g.bracu.ac.bd',
        password: 'Saqline2026!',
        role: 'commuter',
        phone: '+880 1711-123456',
        emergencyPhrase: 'Lavender Moonlight',
        duressPin: '9999',
        normalPin: '1234',
        fakePin: '5678',
      },
      {
        name: 'Badrunnaher Pantho',
        email: 'badrunnaher.pantho@g.bracu.ac.bd',
        password: 'Pantho2026!',
        role: 'guardian',
        phone: '+880 1811-234567',
        emergencyPhrase: 'Silent Crimson',
        duressPin: '8888',
        normalPin: '2345',
        fakePin: '6789',
      },
      {
        name: 'Mehedi Hasan Shovon',
        email: 'mehedi.hasan.shovon@g.bracu.ac.bd',
        password: 'Shovon2026!',
        role: 'operator',
        phone: '+880 1911-345678',
        emergencyPhrase: 'Blue Sentinel',
        duressPin: '7777',
        normalPin: '3456',
        fakePin: '7890',
      },
      {
        name: 'Jamshedul Alam Khan Hridoy',
        email: 'jamshedul.alam@g.bracu.ac.bd',
        password: 'Hridoy2026!',
        role: 'admin',
        phone: '+880 1611-456789',
        emergencyPhrase: 'Apex Guardian',
        duressPin: '6666',
        normalPin: '4567',
        fakePin: '8901',
      },
      {
        name: 'Demo Commuter',
        email: 'commuter@pathprohori.com',
        password: 'pass1234',
        role: 'commuter',
        phone: '+880 1700-111222',
        emergencyPhrase: 'Lavender Moonlight',
        normalPin: '1111',
        fakePin: '2222',
      },
      {
        name: 'Demo Guardian',
        email: 'guardian@pathprohori.com',
        password: 'pass1234',
        role: 'guardian',
        phone: '+880 1800-333444',
        emergencyPhrase: 'Safe Passage',
      },
    ];

    for (const uData of userSeedList) {
      let existingUser = await User.findOne({ email: uData.email });
      if (!existingUser) {
        await User.create(uData);
        console.log(`[Database Seed] Created account: ${uData.email}`);
      } else {
        existingUser.password = uData.password;
        if (uData.normalPin) existingUser.normalPin = uData.normalPin;
        if (uData.fakePin) existingUser.fakePin = uData.fakePin;
        await existingUser.save();
        console.log(`[Database Seed] Synced password for: ${uData.email}`);
      }
    }
  } catch (err) {
    console.error('[Auth Seed Error]', err.message);
  }
};

export const seedInitialIncidents = async () => {
  // Disabled auto-seeding of dummy incidents so database stays clean for manual testing
};
