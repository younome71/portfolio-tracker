const User = require('../models/User');
const logger = require('../utils/logger');
const { sendError, sendSuccess } = require('../utils/apiResponse');

exports.getFamilyMembers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('familyMembers', 'name email role');
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    return sendSuccess(res, user.familyMembers);
  } catch (err) {
    logger.error(`Get family members error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.addFamilyMember = async (req, res) => {
  const { email } = req.body;

  try {
    const familyMember = await User.findOne({ email, role: 'child' });
    if (!familyMember) {
      return sendError(
        res,
        404,
        'FAMILY_MEMBER_NOT_FOUND',
        'User not found or not a child account'
      );
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    if (user._id.equals(familyMember._id)) {
      return sendError(res, 400, 'INVALID_FAMILY_MEMBER', 'Cannot add yourself as a family member');
    }

    if (user.familyMembers.some((id) => id.equals(familyMember._id))) {
      return sendError(res, 400, 'ALREADY_FAMILY_MEMBER', 'User is already a family member');
    }

    await User.updateOne(
      { _id: user._id },
      { $addToSet: { familyMembers: familyMember._id } }
    );

    return sendSuccess(res, { msg: 'Family member added successfully' });
  } catch (err) {
    logger.error(`Add family member error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.removeFamilyMember = async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.user.id },
      { $pull: { familyMembers: req.params.id } }
    );

    if (result.matchedCount === 0) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    return sendSuccess(res, { msg: 'Family member removed successfully' });
  } catch (err) {
    logger.error(`Remove family member error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('familyMembers', 'name email role');

    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    return sendSuccess(res, user);
  } catch (err) {
    logger.error(`Get user profile error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};
