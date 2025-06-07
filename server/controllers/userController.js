const User = require('../models/User');
const logger = require('../utils/logger');

exports.getFamilyMembers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('familyMembers', 'name email');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user.familyMembers);
  } catch (err) {
    logger.error(`Get family members error: ${err.message}`);
    res.status(500).send('Server error');
  }
};

exports.addFamilyMember = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the family member exists
    const familyMember = await User.findOne({ email, role: 'child' });
    if (!familyMember) {
      return res.status(404).json({ msg: 'User not found or not a child account' });
    }

    // Check if already a family member
    const user = await User.findById(req.user.id);
    if (user.familyMembers.includes(familyMember._id)) {
      return res.status(400).json({ msg: 'User is already a family member' });
    }

    user.familyMembers.push(familyMember._id);
    await user.save();

    res.json({ msg: 'Family member added successfully' });
  } catch (err) {
    logger.error(`Add family member error: ${err.message}`);
    res.status(500).send('Server error');
  }
};

exports.removeFamilyMember = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.familyMembers = user.familyMembers.filter(
      memberId => memberId.toString() !== req.params.id
    );
    await user.save();

    res.json({ msg: 'Family member removed successfully' });
  } catch (err) {
    logger.error(`Remove family member error: ${err.message}`);
    res.status(500).send('Server error');
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    // console.log(req);
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('familyMembers', 'name email'); 
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  }
  catch (err) {
    logger.error(`Get user profile error: ${err.message}`);
    res.status(500).send('Server error');
  }
};