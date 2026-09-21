const User = require('../models/User');
const FamilyInvite = require('../models/FamilyInvite');
const logger = require('../utils/logger');
const { sendError, sendSuccess } = require('../utils/apiResponse');

function serializeInvite(invite) {
  const obj = invite.toObject ? invite.toObject() : invite;
  return {
    id: obj._id,
    status: obj.status,
    createdAt: obj.createdAt,
    expiresAt: obj.expiresAt,
    from: obj.from
      ? {
          id: obj.from._id || obj.from,
          name: obj.from.name,
          email: obj.from.email,
        }
      : undefined,
    to: obj.to
      ? {
          id: obj.to._id || obj.to,
          name: obj.to.name,
          email: obj.to.email,
        }
      : undefined,
  };
}

exports.getFamilyMembers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      'familyMembers',
      'name email role'
    );
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

exports.createFamilyInvite = async (req, res) => {
  const { email } = req.body;

  try {
    const invitee = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!invitee) {
      return sendError(
        res,
        404,
        'USER_NOT_FOUND',
        'No account found with that email. They must register first.'
      );
    }

    const parent = await User.findById(req.user.id);
    if (!parent) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    if (parent._id.equals(invitee._id)) {
      return sendError(
        res,
        400,
        'INVALID_FAMILY_MEMBER',
        'You cannot invite yourself'
      );
    }

    if (parent.familyMembers.some((id) => id.equals(invitee._id))) {
      return sendError(
        res,
        400,
        'ALREADY_FAMILY_MEMBER',
        'This user is already a family member'
      );
    }

    const existingPending = await FamilyInvite.findOne({
      from: parent._id,
      to: invitee._id,
      status: 'pending',
    });

    if (existingPending) {
      if (existingPending.isExpired()) {
        existingPending.status = 'cancelled';
        await existingPending.save();
      } else {
        return sendError(
          res,
          400,
          'INVITE_PENDING',
          'An invite to this user is already pending'
        );
      }
    }

    const invite = await FamilyInvite.create({
      from: parent._id,
      to: invitee._id,
    });

    await invite.populate('from', 'name email');
    await invite.populate('to', 'name email');

    logger.info('Family invite created', {
      from: parent.email,
      to: invitee.email,
      requestId: res.locals.requestId,
    });

    return sendSuccess(res, serializeInvite(invite), 201);
  } catch (err) {
    if (err.code === 11000) {
      return sendError(
        res,
        400,
        'INVITE_PENDING',
        'An invite to this user is already pending'
      );
    }
    logger.error(`Create family invite error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.getSentInvites = async (req, res) => {
  try {
    const invites = await FamilyInvite.find({ from: req.user.id })
      .sort({ createdAt: -1 })
      .populate('to', 'name email')
      .populate('from', 'name email')
      .limit(50);

    return sendSuccess(res, invites.map(serializeInvite));
  } catch (err) {
    logger.error(`Get sent invites error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.getReceivedInvites = async (req, res) => {
  try {
    const invites = await FamilyInvite.find({
      to: req.user.id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('from', 'name email')
      .populate('to', 'name email');

    return sendSuccess(res, invites.map(serializeInvite));
  } catch (err) {
    logger.error(`Get received invites error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.acceptFamilyInvite = async (req, res) => {
  try {
    const invite = await FamilyInvite.findById(req.params.id);
    if (!invite) {
      return sendError(res, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    if (invite.to.toString() !== req.user.id) {
      return sendError(res, 403, 'FORBIDDEN', 'This invite is not for you');
    }

    if (invite.status !== 'pending') {
      return sendError(
        res,
        400,
        'INVITE_NOT_PENDING',
        `This invite is already ${invite.status}`
      );
    }

    if (invite.isExpired()) {
      invite.status = 'cancelled';
      await invite.save();
      return sendError(
        res,
        400,
        'INVITE_EXPIRED',
        'This invite has expired. Ask them to send a new one.'
      );
    }

    await User.updateOne(
      { _id: invite.from },
      { $addToSet: { familyMembers: invite.to } }
    );

    invite.status = 'accepted';
    await invite.save();

    await invite.populate('from', 'name email');
    await invite.populate('to', 'name email');

    logger.info('Family invite accepted', {
      inviteId: invite._id,
      requestId: res.locals.requestId,
    });

    return sendSuccess(res, serializeInvite(invite));
  } catch (err) {
    logger.error(`Accept family invite error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.declineFamilyInvite = async (req, res) => {
  try {
    const invite = await FamilyInvite.findById(req.params.id);
    if (!invite) {
      return sendError(res, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    if (invite.to.toString() !== req.user.id) {
      return sendError(res, 403, 'FORBIDDEN', 'This invite is not for you');
    }

    if (invite.status !== 'pending') {
      return sendError(
        res,
        400,
        'INVITE_NOT_PENDING',
        `This invite is already ${invite.status}`
      );
    }

    invite.status = 'declined';
    await invite.save();

    await invite.populate('from', 'name email');
    await invite.populate('to', 'name email');

    return sendSuccess(res, serializeInvite(invite));
  } catch (err) {
    logger.error(`Decline family invite error: ${err.message}`, {
      requestId: res.locals.requestId,
    });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.cancelFamilyInvite = async (req, res) => {
  try {
    const invite = await FamilyInvite.findById(req.params.id);
    if (!invite) {
      return sendError(res, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    if (invite.from.toString() !== req.user.id) {
      return sendError(res, 403, 'FORBIDDEN', 'Only the sender can cancel this invite');
    }

    if (invite.status !== 'pending') {
      return sendError(
        res,
        400,
        'INVITE_NOT_PENDING',
        `This invite is already ${invite.status}`
      );
    }

    invite.status = 'cancelled';
    await invite.save();

    await invite.populate('from', 'name email');
    await invite.populate('to', 'name email');

    return sendSuccess(res, serializeInvite(invite));
  } catch (err) {
    logger.error(`Cancel family invite error: ${err.message}`, {
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
