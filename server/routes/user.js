const express = require('express');
const router = express.Router();
const { auth, isParent } = require('../middlewares/auth');
const { validateFamilyMember, handleValidationErrors } = require('../utils/validation');
const userController = require('../controllers/userController');

router.get('/family', auth, isParent, userController.getFamilyMembers);

router.post(
  '/family',
  auth,
  isParent,
  validateFamilyMember,
  handleValidationErrors,
  userController.addFamilyMember
);

router.delete('/family/:id', auth, isParent, userController.removeFamilyMember);

router.get('/profile', auth, userController.getUserProfile);
// Backward-compatible alias (ignores :id; uses authenticated user)
router.get('/profile/:id', auth, userController.getUserProfile);

module.exports = router;
