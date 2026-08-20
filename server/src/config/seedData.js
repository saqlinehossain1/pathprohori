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
      },
      {
        name: 'Badrunnaher Pantho',
        email: 'badrunnaher.pantho@g.bracu.ac.bd',
        password: 'Pantho2026!',
        role: 'guardian',
        phone: '+880 1811-234567',
        emergencyPhrase: 'Silent Crimson',
        duressPin: '8888',
      },
      {
        name: 'Mehedi Hasan Shovon',
        email: 'mehedi.hasan.shovon@g.bracu.ac.bd',
        password: 'Shovon2026!',
        role: 'operator',
        phone: '+880 1911-345678',
        emergencyPhrase: 'Blue Sentinel',
        duressPin: '7777',
      },
      {
        name: 'Jamshedul Alam Khan Hridoy',
        email: 'jamshedul.alam@g.bracu.ac.bd',
        password: 'Hridoy2026!',
        role: 'admin',
        phone: '+880 1611-456789',
        emergencyPhrase: 'Apex Guardian',
        duressPin: '6666',
      },
      {
        name: 'Demo Commuter',
        email: 'commuter@pathprohori.com',
        password: 'pass1234',
        role: 'commuter',
        phone: '+880 1700-111222',
        emergencyPhrase: 'Lavender Moonlight',
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
      const existingUser = await User.findOne({ email: uData.email });
      if (!existingUser) {
        await User.create(uData);
        console.log(`[Database Seed] Created account: ${uData.email}`);
      }
    }

    // Ensure guardian link between Md Saqline Hossain and Badrunnaher Pantho
    const saqline = await User.findOne({ email: 'saqline.hossain@g.bracu.ac.bd' });
    const pantho = await User.findOne({ email: 'badrunnaher.pantho@g.bracu.ac.bd' });

    if (saqline && (!saqline.guardians || saqline.guardians.length === 0)) {
      saqline.guardians = [
        {
          name: 'Badrunnaher Pantho',
          email: 'badrunnaher.pantho@g.bracu.ac.bd',
          phone: '+880 1811-234567',
          relationship: 'Primary Guardian',
        },
      ];
      await saqline.save();
    }

    if (pantho && (!pantho.guardians || pantho.guardians.length === 0)) {
      pantho.guardians = [
        {
          name: 'Md Saqline Hossain',
          email: 'saqline.hossain@g.bracu.ac.bd',
          phone: '+880 1711-123456',
          relationship: 'Monitored Commuter',
        },
      ];
      await pantho.save();
    }
  } catch (err) {
    console.error('[Auth Seed Error]', err.message);
  }
};

export const seedInitialIncidents = async () => {
  // Disabled auto-seeding of dummy incidents so database stays clean for manual testing
};
