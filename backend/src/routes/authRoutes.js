const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { signup, login, logout } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', protect, logout); 

module.exports = router;