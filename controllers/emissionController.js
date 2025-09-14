const Emission = require('../models/Emission');

// @desc Get all emissions data
// @route GET /api/emissions
// @access Public
exports.getAllEmissions = async (req, res) => {
  try {
    const emissions = await Emission.find().sort({ year: -1 });
    res.json({ success: true, data: emissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Get emissions data for a specific year
// @route GET /api/emissions/:year
// @access Public
exports.getEmissionByYear = async (req, res) => {
  try {
    const emission = await Emission.findOne({ year: req.params.year });
    if (!emission) {
      return res.status(404).json({ success: false, message: 'No data found for this year' });
    }
    res.json({ success: true, data: emission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Add new emissions data
// @route POST /api/emissions
// @access Private (you can add auth middleware later)
exports.addEmissionData = async (req, res) => {
  try {
    const { year, scope1, scope2, scope3 } = req.body;
    
    // Validate input
    if (!year || scope1 === undefined || scope2 === undefined || scope3 === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide year, scope1, scope2, and scope3 values' 
      });
    }

    const total = scope1 + scope2 + scope3;

    // Check if data for this year already exists
    const existingEmission = await Emission.findOne({ year });
    
    let savedEmission;
    if (existingEmission) {
      // Update existing record
      existingEmission.scope1 = scope1;
      existingEmission.scope2 = scope2;
      existingEmission.scope3 = scope3;
      existingEmission.total = total;
      savedEmission = await existingEmission.save();
    } else {
      // Create new record
      const newEmission = new Emission({
        year,
        scope1,
        scope2,
        scope3,
        total
      });
      savedEmission = await newEmission.save();
    }

    // Get Socket.IO instance and emit real-time update
    const io = req.app.get('io');
    if (io) {
      // Fetch all updated emissions data
      const allEmissions = await Emission.find().sort({ year: -1 });
      
      // Emit to all clients in the emissions room
      io.to('emissions').emit('emissions-updated', {
        success: true,
        data: allEmissions,
        newRecord: savedEmission,
        action: existingEmission ? 'updated' : 'created',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Real-time update sent for year ${year}`);
    }

    res.status(201).json({ success: true, data: savedEmission });
  } catch (error) {
    console.error('Error adding emission data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Update emissions data for a specific year
// @route PUT /api/emissions/:year
// @access Private
exports.updateEmissionData = async (req, res) => {
  try {
    const { scope1, scope2, scope3 } = req.body;
    const year = req.params.year;

    if (scope1 === undefined || scope2 === undefined || scope3 === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide scope1, scope2, and scope3 values' 
      });
    }

    const total = scope1 + scope2 + scope3;

    const updatedEmission = await Emission.findOneAndUpdate(
      { year },
      { scope1, scope2, scope3, total },
      { new: true, runValidators: true }
    );

    if (!updatedEmission) {
      return res.status(404).json({ success: false, message: 'No data found for this year' });
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allEmissions = await Emission.find().sort({ year: -1 });
      
      io.to('emissions').emit('emissions-updated', {
        success: true,
        data: allEmissions,
        updatedRecord: updatedEmission,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, data: updatedEmission });
  } catch (error) {
    console.error('Error updating emission data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Delete emissions data for a specific year
// @route DELETE /api/emissions/:year
// @access Private
exports.deleteEmissionData = async (req, res) => {
  try {
    const year = req.params.year;

    const deletedEmission = await Emission.findOneAndDelete({ year });

    if (!deletedEmission) {
      return res.status(404).json({ success: false, message: 'No data found for this year' });
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allEmissions = await Emission.find().sort({ year: -1 });
      
      io.to('emissions').emit('emissions-updated', {
        success: true,
        data: allEmissions,
        deletedRecord: deletedEmission,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Emission data deleted successfully' });
  } catch (error) {
    console.error('Error deleting emission data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
