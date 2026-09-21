const express = require('express');
const router = express.Router();
const { auth, isParent } = require('../middlewares/auth');
const { validateFamilyMember, handleValidationErrors } = require('../utils/validation');
const userController = require('../controllers/userController');

router.get('/family', auth, isParent, userController.getFamilyMembers);

router.post(
  '/family/invites',
  auth,
  isParent,
  validateFamilyMember,
  handleValidationErrors,
  userController.createFamilyInvite
);

router.get('/family/invites/sent', auth, isParent, userController.getSentInvites);

router.get('/family/invites/received', auth, userController.getReceivedInvites);

router.post('/family/invites/:id/accept', auth, userController.acceptFamilyInvite);

router.post('/family/invites/:id/decline', auth, userController.declineFamilyInvite);

router.delete('/family/invites/:id', auth, isParent, userController.cancelFamilyInvite);

router.delete('/family/:id', auth, isParent, userController.removeFamilyMember);

router.get('/profile', auth, userController.getUserProfile);
// Backward-compatible alias (ignores :id; uses authenticated user)
router.get('/profile/:id', auth, userController.getUserProfile);

module.exports = router;
