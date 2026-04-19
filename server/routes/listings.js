const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const listingController = require('../controllers/listingController');

const router = express.Router();
const multer = require('multer');
const path = require('path');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/') },
  filename: function (req, file, cb) { 
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  },
});

router.get('/', listingController.getAllListings);
router.get('/:id', listingController.getListingById);
router.post('/', authMiddleware, upload.array('photos', 5), listingController.createListing);
router.put('/:id', authMiddleware, upload.array('photos', 5), listingController.updateListing);
router.delete('/:id', authMiddleware, listingController.deleteListing);

module.exports = router;
