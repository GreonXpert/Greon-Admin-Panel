const PbsCategory = require('../../models/PoweredByScience/pbsCategory');
const PbsFramework = require('../../models/PoweredByScience/pbsFramework');
const path = require('path');

// @desc Get all PBS categories
// @route GET /api/pbs/categories
// @access Public
exports.getPbsCategories = async (req, res) => {
  try {
    const categories = await PbsCategory.find();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Add a new PBS category
// @route POST /api/pbs/categories
// @access Private
exports.addPbsCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Please provide name and description' });
    }
    const newCategory = new PbsCategory({ name, description });
    await newCategory.save();

    const io = req.app.get('io');
    const categories = await PbsCategory.find();
    io.to('poweredByScience').emit('pbs-categories-updated', { success: true, data: categories });

    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Update a PBS category
// @route PUT /api/pbs/categories/:id
// @access Private
exports.updatePbsCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const updated = await PbsCategory.findByIdAndUpdate(
            id,
            { name, description },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const io = req.app.get('io');
        const categories = await PbsCategory.find();
        io.to('poweredByScience').emit('pbs-categories-updated', { success: true, data: categories });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc Delete a PBS category
// @route DELETE /api/pbs/categories/:id
// @access Private
exports.deletePbsCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const removed = await PbsCategory.findByIdAndDelete(id);

        if (!removed) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const io = req.app.get('io');
        const categories = await PbsCategory.find();
        io.to('poweredByScience').emit('pbs-categories-updated', { success: true, data: categories });

        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// @desc Get all PBS frameworks
// @route GET /api/pbs/frameworks
// @access Public
exports.getPbsFrameworks = async (req, res) => {
  try {
    const frameworks = await PbsFramework.find().populate('category');
    res.json({ success: true, data: frameworks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Get PBS frameworks by category
// @route GET /api/pbs/frameworks/category/:categoryId
// @access Public
exports.getPbsFrameworksByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const frameworks = await PbsFramework.find({ category: categoryId }).populate('category');
        res.json({ success: true, data: frameworks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// @desc Add a new PBS framework
// @route POST /api/pbs/frameworks
// @access Private
exports.addPbsFramework = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !description || !category) {
      return res.status(400).json({ success: false, message: 'Please provide name, description, and category' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const pbsCategory = await PbsCategory.findById(category);
    if (!pbsCategory) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const folderName = pbsCategory.name.replace(/\s+/g, '-').toLowerCase();
    const imageUrl = `/uploads/PoweredByScience/${folderName}/${req.file.filename}`;

    const newFramework = new PbsFramework({ name, description, imageUrl, category });
    await newFramework.save();

    const io = req.app.get('io');
    const frameworks = await PbsFramework.find().populate('category');
    io.to('poweredByScience').emit('pbs-frameworks-updated', { success: true, data: frameworks });

    res.status(201).json({ success: true, data: newFramework });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a PBS Framework
// @route   PUT /api/pbs/frameworks/:id
// @access  Private
exports.updatePbsFramework = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (category) updates.category = category;

        if (req.file) {
            const pbsCategory = await PbsCategory.findById(category);
            if (!pbsCategory) {
                return res.status(400).json({ success: false, message: 'Invalid category' });
            }
            const folderName = pbsCategory.name.replace(/\s+/g, '-').toLowerCase();
            updates.imageUrl = `/uploads/PoweredByScience/${folderName}/${req.file.filename}`;
        }


        const updated = await PbsFramework.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('category');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Framework not found' });
        }

        const io = req.app.get('io');
        const frameworks = await PbsFramework.find().populate('category');
        io.to('poweredByScience').emit('pbs-frameworks-updated', { success: true, data: frameworks });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a PBS Framework
// @route   DELETE /api/pbs/frameworks/:id
// @access  Private
exports.deletePbsFramework = async (req, res) => {
    try {
        const { id } = req.params;

        const removed = await PbsFramework.findByIdAndDelete(id);

        if (!removed) {
            return res.status(404).json({ success: false, message: 'Framework not found' });
        }

        const io = req.app.get('io');
        const frameworks = await PbsFramework.find().populate('category');
        io.to('poweredByScience').emit('pbs-frameworks-updated', { success: true, data: frameworks });

        res.json({ success: true, message: 'Framework deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};