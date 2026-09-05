import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const userPayload = (user) => ({
  _id: user._id,
  username: user.username,
  fullName: user.fullName,
  role: user.role,
  territory: user.territory,
  distributor: user.distributor,
  region: user.region,
  profilePicture: user.profilePicture || '',
});

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    res.json({
      ...userPayload(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const register = async (req, res) => {
  try {
    const { username, password, fullName, role, territory, distributor, region } = req.body;

    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['omr', 'merchandiser', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      fullName,
      role,
      territory: territory || '',
      distributor: distributor || '',
      region: region || '',
    });

    res.status(201).json({
      ...userPayload(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const getMe = async (req, res) => {
  res.json(userPayload(req.user));
};

// @desc    Update own profile picture
// @route   PUT /api/auth/profile-picture
export const updateProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body;
    if (profilePicture === undefined) {
      return res.status(400).json({ message: 'profilePicture is required' });
    }
    // Limit ~1.5MB base64 roughly
    if (typeof profilePicture === 'string' && profilePicture.length > 2_000_000) {
      return res.status(400).json({ message: 'Image too large. Please use a smaller photo.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profilePicture = profilePicture || '';
    await user.save();

    res.json(userPayload(user));
  } catch (error) {
    console.error('Profile picture error:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
};
