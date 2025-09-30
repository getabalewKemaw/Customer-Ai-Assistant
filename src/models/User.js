import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';
import validator from "validator";
dotenv.config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => validator.isEmail(v || ''),
        message: 'Invalid email',
      },
    },

    password: {
      type: String, // hashed. optional for google-only accounts.
    },

    googleId: {
      type: String,
      //default: null,
    },

    authMethods: {
      type: [String],
      enum: ['email', 'google'],
      required: true,
      default: [],
    },

    role: {
      type: String,
      enum: ['customer', 'agent', 'admin'],
      default: 'customer',
      required: true,
    },

    profilePicture: { type: String },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Sparse unique index for googleId (allows many documents without googleId)
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// Pre-save: hash password if modified
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Ensure authMethods has unique values
  if (Array.isArray(this.authMethods)) {
    this.authMethods = Array.from(new Set(this.authMethods));
  }

  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

/**
 * Static helper: find or create (link) a user from Google profile data.
 * - If user exists with googleId -> return it.
 * - Else if user exists by email -> attach googleId and add 'google' to authMethods.
 * - Else -> create new user with authMethods ['google'].
 *
 * NOTE: For safety, prefer linking only if Google confirms email_verified === true.
 */
userSchema.statics.findOrCreateByGoogle = async function ({
  googleId,
  email,
  name,
  profilePicture,
  emailVerified = true, // pass in the google token verification email_verified
}) {
  if (!googleId) throw new Error('googleId is required');
  if (!email) throw new Error('email is required for this MVP');

  const User = this;
  email = email.toLowerCase();

  // 1) find by googleId
  let user = await User.findOne({ googleId });
  if (user) return user;

  // 2) find by email
  user = await User.findOne({ email });
  if (user) {
    // link the googleId if not present
    user.googleId = googleId;
    if (!user.authMethods.includes('google')) user.authMethods.push('google');
    if (!user.profilePicture && profilePicture) user.profilePicture = profilePicture;
    if (emailVerified) user.isVerified = true;
    await user.save();
    return user;
  }

  // 3) create new google user
  const newUser = await User.create({
    name: name || email.split('@')[0],
    email,
    googleId,
    profilePicture,
    isVerified: !!emailVerified,
    authMethods: ['google'],
  });

  return newUser;
};

export const User = mongoose.model("User", userSchema);
export default User;