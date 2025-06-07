const express = require('express');
const router = express.Router();
const { validateUserRegistration, validateUserLogin, handleValidationErrors } = require('../utils/validation');
const authController = require('../controllers/authController');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateUserRegistration, handleValidationErrors, authController.register);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, handleValidationErrors, authController.login);

module.exports = router;
