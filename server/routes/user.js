const express = require('express');
const router = express.Router();
const { auth, isParent } = require('../middlewares/auth');
const userController = require('../controllers/userController');

// @route   GET api/user/family
// @desc    Get family members
// @access  Private (Parent only)
router.get('/family', auth, isParent, userController.getFamilyMembers);

// @route   POST api/user/family
// @desc    Add family member
// @access  Private (Parent only)
router.post('/family', auth, isParent, userController.addFamilyMember);

// @route   DELETE api/user/family/:id
// @desc    Remove family member
// @access  Private (Parent only)
router.delete('/family/:id', auth, isParent, userController.removeFamilyMember);

// @route   GET api/user/profile
// @desc    Get user profile
router.get('/profile/:id', auth, userController.getUserProfile);

module.exports = router;
