// controllers/projectController.js

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Project = require('../models/project');

// -------- helpers --------
const deleteFileIfExists = (filePath) => {
  try {
    if (!filePath) return;
    // stored as /uploads/projects/xxx; normalize to disk path
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted file: ${filePath}`);
    }
  } catch (err) {
    console.error('❌ deleteFileIfExists error:', err);
  }
};

const deleteFiles = (paths = []) => paths.forEach(p => deleteFileIfExists(p));

const filesToUrlList = (filesArr = []) =>
  filesArr.map(f => ({ url: `/uploads/projects/${f.filename}`, caption: '' }));

// -------- CRUD --------

// GET /api/projects
exports.getAllProjects = async (req, res) => {
  try {
    const {
      status, category, q, featured, limit, sort = 'order' // sort: order|created|updated|year|title
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category) query.category = new RegExp(category, 'i');
    if (featured !== undefined) query.featured = featured === 'true';
    if (q) query.$text = { $search: q };

    let sortQuery = {};
    switch (sort) {
      case 'title': sortQuery = { title: 1 }; break;
      case 'created': sortQuery = { createdAt: -1 }; break;
      case 'updated': sortQuery = { updatedAt: -1 }; break;
      case 'year': sortQuery = { completedYear: -1 }; break;
      default: sortQuery = { order: 1, createdAt: -1 };
    }

    let cursor = Project.find(query).sort(sortQuery);
    if (limit) cursor = cursor.limit(parseInt(limit, 10));

    const data = await cursor;
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('getAllProjects error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/projects/:id
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid project ID' });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.json({ success: true, data: project });
  } catch (err) {
    console.error('getProjectById error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /api/projects
exports.addProject = async (req, res) => {
  try {
    const io = req.app.get('io');

    const body = req.body || {};
    // galleries
    const images = filesToUrlList((req.files?.images) || []);
    // cover
    const mainImage =
      (req.files?.mainImage?.[0] && `/uploads/projects/${req.files.mainImage[0].filename}`) ||
      body.mainImage || '';

    const parseMaybeArray = (v) =>
      v == null ? [] : Array.isArray(v) ? v : (() => { try { return JSON.parse(v); } catch { return [String(v)]; } })();

    const doc = await Project.create({
      title: body.title,
      category: body.category,
      status: body.status,
      location: body.location,
      completedYear: body.completedYear,
      area: body.area,
      client: body.client,
      architect: body.architect,
      coordinates: body.coordinates ? JSON.parse(body.coordinates) : undefined,

      about: body.about,
      description: body.description,

      mainImage,
      images,

      style: body.style
        ? (typeof body.style === 'string' ? JSON.parse(body.style) : body.style)
        : undefined,

      order: Number(body.order) || 0,
      featured: body.featured === 'true' || body.featured === true,
    });

    // realtime
    if (io) {
      io.to('projects').emit('projects-updated', { action: 'created', data: await Project.find({ status: 'Completed' }).sort({ order: 1, createdAt: -1 }) });
      io.to('projects-admin').emit('projects-admin-updated', { action: 'created', data: await Project.find().sort({ order: 1, createdAt: -1 }) });
    }

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('addProject error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid project ID' });

    const existing = await Project.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });

    const body = req.body || {};

    // handle new uploads
    const newGallery = filesToUrlList((req.files?.images) || []);
    let mainImage = existing.mainImage;
    if (req.files?.mainImage?.[0]) {
      // delete old main image file if it existed
      deleteFileIfExists(existing.mainImage);
      mainImage = `/uploads/projects/${req.files.mainImage[0].filename}`;
    }

    // Optionally remove specific gallery URLs
    const removeImageUrls = body.removeImageUrls
      ? (Array.isArray(body.removeImageUrls) ? body.removeImageUrls : JSON.parse(body.removeImageUrls))
      : [];

    if (removeImageUrls.length) {
      existing.images
        .filter(img => img?.url && removeImageUrls.includes(img.url))
        .forEach(img => deleteFileIfExists(img.url));
    }

    // merge gallery: keep non-removed previous + add new
    const keptPrev = existing.images.filter(img => !removeImageUrls.includes(img.url));
    const mergedImages = [...keptPrev, ...newGallery];

    const patch = {
      title: body.title ?? existing.title,
      category: body.category ?? existing.category,
      status: body.status ?? existing.status,

      location: body.location ?? existing.location,
      completedYear: body.completedYear ?? existing.completedYear,
      area: body.area ?? existing.area,
      client: body.client ?? existing.client,
      architect: body.architect ?? existing.architect,
      coordinates: body.coordinates ? JSON.parse(body.coordinates) : existing.coordinates,

      about: body.about ?? existing.about,
     
      description: body.description ?? existing.description,

      mainImage,
      images: mergedImages,

      style:
        body.style != null
          ? (typeof body.style === 'string' ? JSON.parse(body.style) : body.style)
          : existing.style,

      order: body.order != null ? Number(body.order) : existing.order,
      featured:
        body.featured != null ? (body.featured === 'true' || body.featured === true) : existing.featured,
    };

    const updated = await Project.findByIdAndUpdate(id, patch, { new: true });

    if (io) {
      io.to('projects').emit('projects-updated', { action: 'updated', data: await Project.find({ status: 'Completed' }).sort({ order: 1, createdAt: -1 }) });
      io.to('projects-admin').emit('projects-admin-updated', { action: 'updated', data: await Project.find().sort({ order: 1, createdAt: -1 }) });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateProject error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid project ID' });

    const doc = await Project.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Project not found' });

    // delete media
    deleteFileIfExists(doc.mainImage);
    deleteFiles((doc.images || []).map(i => i.url));

    await Project.findByIdAndDelete(id);

    if (io) {
      io.to('projects').emit('projects-updated', { action: 'deleted', data: await Project.find({ status: 'Completed' }).sort({ order: 1, createdAt: -1 }) });
      io.to('projects-admin').emit('projects-admin-updated', { action: 'deleted', data: await Project.find().sort({ order: 1, createdAt: -1 }) });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PUT /api/projects/reorder
exports.reorderProjects = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds))
      return res.status(400).json({ success: false, message: 'orderedIds must be an array' });

    await Promise.all(orderedIds.map((id, idx) => Project.findByIdAndUpdate(id, { order: idx })));
    const data = await Project.find().sort({ order: 1, createdAt: -1 });

    if (io) {
      io.to('projects-admin').emit('projects-admin-updated', { action: 'reordered', data });
      io.to('projects').emit('projects-updated', { action: 'reordered', data: await Project.find({ status: 'Completed' }).sort({ order: 1, createdAt: -1 }) });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('reorderProjects error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};