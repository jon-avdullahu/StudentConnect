const ListingModel = require('../models/listingModel');
const UserModel = require('../models/userModel');

function bodyField(value) {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

exports.getAllListings = async (req, res) => {
  try {
    const { max_price, min_price, search } = req.query;
    const listings = await ListingModel.getAllActive(max_price, min_price, search);
    res.json(listings);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid listing id.' });
    const listing = await ListingModel.getById(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user || user.role !== 'landlord') {
      return res.status(403).json({ error: 'Only landlords can create listings.' });
    }

    const title = String(bodyField(req.body.title) ?? '').trim();
    const description = String(bodyField(req.body.description) ?? '').trim();
    const priceRaw = bodyField(req.body.price);
    const location_lat = bodyField(req.body.location_lat);
    const location_lng = bodyField(req.body.location_lng);

    if (!title || title.length > 200) {
      return res.status(400).json({ error: 'Title is required and must be under 200 characters.' });
    }
    if (!description || description.length > 5000) {
      return res.status(400).json({ error: 'Description is required and must be under 5000 characters.' });
    }

    const priceMissing =
      priceRaw == null || (typeof priceRaw === 'string' && priceRaw.trim() === '');
    if (priceMissing) {
      return res.status(400).json({ error: 'Price is required.' });
    }
    const price = parseFloat(priceRaw);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(file => `/uploads/${file.filename}`);
    } else if (req.body.photosUrls) {
      const urls = bodyField(req.body.photosUrls) ?? req.body.photosUrls;
      photos = String(urls)
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
    }

    const listing = await ListingModel.create(req.userId, title, description, price, location_lat, location_lng, photos);
    res.status(201).json(listing);
  } catch (err) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

const VALID_LISTING_STATUSES = ['active', 'inactive', 'rented'];

exports.updateListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid listing id.' });

    const isOwner = await ListingModel.checkOwnership(id, req.userId);
    if (isOwner === null) return res.status(404).json({ error: 'Listing not found' });
    if (!isOwner) return res.status(403).json({ error: 'You do not have permission to edit this listing' });

    const { title, description, price, location_lat, location_lng, status } = req.body;
    const updates = [];
    const values = [];
    let valIndex = 1;

    if (title) {
      if (String(title).length > 200) return res.status(400).json({ error: 'Title must be under 200 characters.' });
      updates.push(`title = $${valIndex}`); values.push(title); valIndex++;
    }
    if (description) {
      if (String(description).length > 5000) return res.status(400).json({ error: 'Description must be under 5000 characters.' });
      updates.push(`description = $${valIndex}`); values.push(description); valIndex++;
    }
    if (price != null) {
      const p = parseFloat(price);
      if (!Number.isFinite(p) || p <= 0) return res.status(400).json({ error: 'Price must be a positive number.' });
      updates.push(`price = $${valIndex}`); values.push(p); valIndex++;
    }
    if (location_lat !== undefined) { updates.push(`location_lat = $${valIndex}`); values.push(location_lat); valIndex++; }
    if (location_lng !== undefined) { updates.push(`location_lng = $${valIndex}`); values.push(location_lng); valIndex++; }
    if (status) {
      if (!VALID_LISTING_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
      updates.push(`status = $${valIndex}`); values.push(status); valIndex++;
    }

    let photos;
    if (req.files && req.files.length > 0) {
      photos = req.files.map(file => `/uploads/${file.filename}`);
    } else if (req.body.photos && Array.isArray(req.body.photos)) {
      photos = req.body.photos;
    }

    await ListingModel.update(id, updates, values, valIndex, photos);
    res.json({ message: 'Listing updated successfully' });
  } catch (err) {
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const isOwner = await ListingModel.checkOwnership(id, req.userId);
    if (isOwner === null) return res.status(404).json({ error: 'Listing not found' });
    if (!isOwner) return res.status(403).json({ error: 'You do not have permission to delete this listing' });

    await ListingModel.delete(id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};
