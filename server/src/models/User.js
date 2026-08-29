import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['commuter', 'guardian', 'operator', 'admin'],
      default: 'commuter',
    },
    emergencyPhrase: {
      type: String,
      default: 'Lavender Moonlight',
    },
    duressPin: {
      type: String,
      default: '9999',
    },
    safetyPin: {
      type: String,
      default: '1234',
    },
    // Dual-PIN Silent Duress Deactivation: genuine alarm deactivation PIN.
    normalPin: {
      type: String,
      select: false,
    },
    // Dual-PIN Silent Duress Deactivation: looks identical to normalPin on-screen,
    // but secretly escalates the trip to the DURESS status instead of deactivating it.
    fakePin: {
      type: String,
      select: false,
    },
    guardians: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        phone: String,
        email: String,
        avatarUrl: String,
        relationship: {
          type: String,
          default: 'Guardian',
        },
      },
    ],
    avatarUrl: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'female',
    },
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    safetyStatus: {
      type: String,
      enum: ['SAFE', 'UNSAFE'],
      default: 'SAFE',
    },
    safetyStatusChangedAt: {
      type: Date,
      default: Date.now,
    },
    safetyStatusLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  { timestamps: true }
);

// Hash password & security PINs before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('normalPin') && this.normalPin) {
    const salt = await bcrypt.genSalt(10);
    this.normalPin = await bcrypt.hash(this.normalPin, salt);
  }
  if (this.isModified('fakePin') && this.fakePin) {
    const salt = await bcrypt.genSalt(10);
    this.fakePin = await bcrypt.hash(this.fakePin, salt);
  }
  next();
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compare the genuine alarm deactivation PIN (requires normalPin to be explicitly selected)
userSchema.methods.matchNormalPin = async function (enteredPin) {
  if (!this.normalPin || !enteredPin) return false;
  return await bcrypt.compare(String(enteredPin), this.normalPin);
};

// Compare the secret silent-duress PIN (requires fakePin to be explicitly selected)
userSchema.methods.matchFakePin = async function (enteredPin) {
  if (!this.fakePin || !enteredPin) return false;
  return await bcrypt.compare(String(enteredPin), this.fakePin);
};

export const User = mongoose.model('User', userSchema);
