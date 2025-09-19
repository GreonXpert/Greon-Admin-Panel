// controllers/testimonialController.js
const Testimonial = require('../models/Testimonials/testimonialModel');

// Build query safely from request
const buildQuery = (req) => {
  const q = {};
  const { status, featured, minRating, search } = req.query;

  if (status) q.status = status;
  if (featured !== undefined) q.featured = featured === 'true';
  if (minRating) q.rating = { $gte: Number(minRating) };

  if (search) {
    q.$text = { $search: search };
  }
  return q;
};

// --- helper: broadcast fresh counts to admin ---
const emitCounts = async (io) => {
  if (!io) return;
  const [total, approved, pending, rejected] = await Promise.all([
    Testimonial.countDocuments({}),
    Testimonial.countDocuments({ status: 'approved' }),
    Testimonial.countDocuments({ status: 'pending'  }),
    Testimonial.countDocuments({ status: 'rejected' }),
  ]);
  io.to('testimonials-admin').emit('testimonial-count', {
    success: true,
    data: { total, approved, pending, rejected }
  });
};

// GET /api/testimonials/count  (supports filters, e.g. ?status=approved)
exports.getCount = async (req, res) => {
  try {
    const count = await Testimonial.countDocuments(buildQuery(req));
    res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('❌ Count Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// GET /api/testimonials
exports.getTestimonials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-rating,-createdAt', // default same spirit as FE
    } = req.query;

    const query = buildQuery(req);
    const perPage = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * perPage;

    const [data, count] = await Promise.all([
      Testimonial.find(query).sort(sort.split(',').join(' ')).skip(skip).limit(perPage),
      Testimonial.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: perPage,
        total: count,
        pages: Math.ceil(count / perPage),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ Get Testimonials Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ---------- count (NEW) ----------
exports.getCount = async (_req, res) => {
  try {
    const count = await Testimonial.countDocuments({});
    res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('❌ Count Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// POST /api/testimonials  (admin)
exports.createTestimonial = async (req, res) => {
  try {
    const {
      name,
      position = '',
      company = '',
      content,
      rating = 5,
      avatar = '',
      featured = false,
      status = 'approved',
    } = req.body;

    if (!name || !content) {
      return res.status(400).json({ success: false, message: 'Name and content are required' });
    }

    const photoUrl = req.file ? `/uploads/testimonials/${req.file.filename}` : '';

    const doc = await Testimonial.create({
      name,
      position,
      company,
      content,
      rating,
      // Prefer uploaded photo; fallback to avatar URL
      photoUrl,
      avatar: photoUrl ? '' : avatar,
      featured,
      status,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      if (doc.status === 'approved') {
        io.to('testimonials').emit('testimonial-created', { success: true, data: doc });
        io.to('testimonials-public').emit('testimonial-created', { success: true, data: doc });
      }
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'created', data: doc });
    }

    res.status(201).json({ success: true, data: doc, message: 'Testimonial created' });
  } catch (err) {
    console.error('❌ Create Testimonial Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PUT /api/testimonials/:id (admin)
exports.updateTestimonial = async (req, res) => {
  try {
    const updates = { ...req.body, updatedBy: req.user?._id };
    if (req.file) {
      // New uploaded photo overrides avatar
      updates.photoUrl = `/uploads/testimonials/${req.file.filename}`;
      updates.avatar = '';
    }

    const doc = await Testimonial.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Testimonial not found' });

    const io = req.app.get('io');
    if (io) {
      if (doc.status === 'approved') {
        io.to('testimonials').emit('testimonial-updated', { success: true, data: doc });
        io.to('testimonials-public').emit('testimonial-updated', { success: true, data: doc });
      }
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'updated', data: doc });
    }

    res.json({ success: true, data: doc, message: 'Testimonial updated' });
  } catch (err) {
    console.error('❌ Update Testimonial Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// DELETE /api/testimonials/:id (admin)
exports.deleteTestimonial = async (req, res) => {
  try {
    const doc = await Testimonial.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Testimonial not found' });

    const io = req.app.get('io');
    if (io) {
      io.to('testimonials').emit('testimonial-deleted', { success: true, id: doc._id });
      io.to('testimonials-public').emit('testimonial-deleted', { success: true, id: doc._id });
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'deleted', id: doc._id });
    }

    res.json({ success: true, message: 'Testimonial deleted', id: doc._id });
  } catch (err) {
    console.error('❌ Delete Testimonial Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/testimonials/:id/status (admin)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const doc = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { $set: { status, updatedBy: req.user?._id } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Testimonial not found' });

    const io = req.app.get('io');
    if (io) {
      // If it became approved, push to public rooms as a create/update
      const payload = { success: true, data: doc };
      if (status === 'approved') {
        io.to('testimonials').emit('testimonial-updated', payload);
        io.to('testimonials-public').emit('testimonial-updated', payload);
      }
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'status', data: doc });
    }

    res.json({ success: true, data: doc, message: 'Status updated' });
  } catch (err) {
    console.error('❌ Update Status Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /api/testimonials/:id/feature (admin)
exports.toggleFeatured = async (req, res) => {
  try {
    const doc = await Testimonial.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    doc.featured = !doc.featured;
    doc.updatedBy = req.user?._id;
    await doc.save();

    const io = req.app.get('io');
    if (io) {
      if (doc.status === 'approved') {
        io.to('testimonials').emit('testimonial-updated', { success: true, data: doc });
        io.to('testimonials-public').emit('testimonial-updated', { success: true, data: doc });
      }
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'feature', data: doc });
    }

    res.json({ success: true, data: doc, message: `Featured ${doc.featured ? 'enabled' : 'disabled'}` });
  } catch (err) {
    console.error('❌ Toggle Featured Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


/**
 * POST /api/testimonials/submission-link   (PUBLIC)
 * Returns a public URL pointing to the FRONTEND (not the API),
 * plus the current count and a 4-digit code derived from count+1.
 */
exports.getPublicSubmissionLink = async (req, res) => {
  try {
    const count = await Testimonial.countDocuments({});
    const nextOrdinal = count + 1;
    const code = String(nextOrdinal).padStart(4, '0'); // 4-digit, no randomness

    // ---- figure out the FRONTEND origin ----
    // 1) explicit env for FE (recommended): FRONTEND_BASE_URL=http://localhost:3000
    // 2) the browser Origin header when request comes from your FE
    // 3) legacy/public override if you still use it: PUBLIC_ORIGIN
    // 4) last resort: derive from API host (respecting proxies)
    const getApiOrigin = (r) => {
      const xfProto = r.get('x-forwarded-proto');
      const xfHost  = r.get('x-forwarded-host');
      if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
      return `${r.protocol}://${r.get('host')}`;
    };

    const frontendOrigin =
      process.env.FRONTEND_BASE_URL ||
      req.get('origin') ||
      process.env.PUBLIC_ORIGIN ||
      getApiOrigin(req);

    // ---- frontend route path (plural, matches your React Router) ----
    // e.g., PUBLIC_TESTIMONIAL_PATH=/testimonials/submit
    const rawBasePath = process.env.PUBLIC_TESTIMONIAL_PATH || '/testimonials/submit';
    const basePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`;

    // ---- build normalized link (no double slashes) ----
    const originClean = frontendOrigin.replace(/\/+$/, '');
    const pathClean   = basePath.replace(/\/+$/, '');
    const link = `${originClean}${pathClean}/${code}`;

    return res.json({
      success: true,
      data: { count, code, link },
      message: 'Public submission link generated',
    });
  } catch (err) {
    console.error('❌ Public Submission Link Error:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};


/**
 * POST /api/testimonials/public             (PUBLIC)
 * Accepts a testimonial submission with optional photo upload (field: "photo").
 * If no photo, uses `avatar` from the body. Defaults to "pending" status.
 * Emits sockets: admin rooms always; public rooms only if status is "approved".
 */
exports.publicCreateTestimonial = async (req, res) => {
  try {
    const {
      name,
      position = '',
      company = '',
      content,
      rating = 5,
      avatar = '',
      featured = false,
      // Even if a caller tries to pass status, keep public submissions "pending" by default
      status = 'pending',
      source = 'public-form',
    } = req.body;

    if (!name || !content) {
      return res.status(400).json({ success: false, message: 'Name and content are required' });
    }

    const photoUrl = req.file ? `/uploads/testimonials/${req.file.filename}` : '';

    const doc = await Testimonial.create({
      name,
      position,
      company,
      content,
      rating,
      photoUrl,
      avatar: photoUrl ? '' : avatar,
      featured,
      status,            // usually "pending" for public submissions
      source,
    });

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      // Always notify admins
      io.to('testimonials-admin').emit('testimonials-updated', { success: true, action: 'created-public', data: doc });
      // Only push to public streams if it’s already approved
      if (doc.status === 'approved') {
        io.to('testimonials').emit('testimonial-created', { success: true, data: doc });
        io.to('testimonials-public').emit('testimonial-created', { success: true, data: doc });
      }
    }

    return res.status(201).json({
      success: true,
      data: doc,
      message: 'Thanks! Your testimonial was submitted.',
    });
  } catch (err) {
    console.error('❌ Public Create Testimonial Error:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

