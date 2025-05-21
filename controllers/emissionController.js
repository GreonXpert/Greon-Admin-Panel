// controllers/emissionController.js - Emissions Data Management Controller
const Emission = require('../models/Emission');

// Get all emissions data (Public route)
exports.getAllEmissions = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startYear, endYear } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Add year range filter if provided
    if (startYear || endYear) {
      filter.year = {};
      if (startYear) filter.year.$gte = parseInt(startYear);
      if (endYear) filter.year.$lte = parseInt(endYear);
    }
    
    // Fetch emissions data with sorting (oldest to newest)
    const emissions = await Emission.find(filter)
      .sort({ year: 1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: emissions.length,
      data: emissions
    });
  } catch (error) {
    console.error('Get all emissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get a single year's emissions data (Public route)
exports.getEmissionByYear = async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year input
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid year between 1900 and 2100'
      });
    }
    
    // Find the emission data for the specified year
    const emission = await Emission.findOne({ year: parseInt(year) })
      .select('-__v');
    
    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `No emission data found for year ${year}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: emission
    });
  } catch (error) {
    console.error(`Get emission for year ${req.params.year} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new emissions data for a year (Protected route)
exports.createEmission = async (req, res) => {
  try {
    const { year } = req.body;
    
    // Validate year input
    if (!year || isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid year between 1900 and 2100'
      });
    }
    
    // Check if data for this year already exists
    const existingEmission = await Emission.findOne({ year });
    if (existingEmission) {
      return res.status(400).json({
        success: false,
        message: `Emission data for year ${year} already exists`
      });
    }
    
    // Create new emission record
    const newEmission = new Emission({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    // Save the emission data
    const savedEmission = await newEmission.save();
    
    res.status(201).json({
      success: true,
      message: `Emission data for year ${year} created successfully`,
      data: savedEmission
    });
  } catch (error) {
    console.error('Create emission error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Emission data for year ${req.body.year} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update emissions data for a year (Protected route)
exports.updateEmission = async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year input
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid year between 1900 and 2100'
      });
    }
    
    // Extract the fields to update (exclude year as it is the primary key)
    const { year: newYear, ...updateData } = req.body;
    
    // If trying to change the year, check if the new year already exists
    if (newYear && newYear !== parseInt(year)) {
      const existingEmission = await Emission.findOne({ year: newYear });
      if (existingEmission) {
        return res.status(400).json({
          success: false,
          message: `Cannot change year: Emission data for year ${newYear} already exists`
        });
      }
    }
    
    // Add updatedBy field
    updateData.updatedBy = req.user.id;
    
    // If new year is provided, include it in the update
    if (newYear) {
      updateData.year = newYear;
    }
    
    // Update the emission data
    const emission = await Emission.findOneAndUpdate(
      { year: parseInt(year) },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `No emission data found for year ${year}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Emission data for year ${year} updated successfully`,
      data: emission
    });
  } catch (error) {
    console.error(`Update emission for year ${req.params.year} error:`, error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete emissions data for a year (Protected route)
exports.deleteEmission = async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year input
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid year between 1900 and 2100'
      });
    }
    
    // Find and delete the emission data
    const emission = await Emission.findOneAndDelete({ year: parseInt(year) });
    
    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `No emission data found for year ${year}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Emission data for year ${year} deleted successfully`,
      data: emission
    });
  } catch (error) {
    console.error(`Delete emission for year ${req.params.year} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Bulk import emissions data (Protected route)
exports.bulkImportEmissions = async (req, res) => {
  try {
    const { data, overwrite = false } = req.body;
    
    // Validate input
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid emissions data array for import'
      });
    }
    
    const results = {
      created: [],
      updated: [],
      errors: []
    };
    
    // Process each data item
    for (const item of data) {
      try {
        // Validate year
        if (!item.year || isNaN(item.year) || item.year < 1900 || item.year > 2100) {
          results.errors.push({
            year: item.year,
            message: 'Invalid year value'
          });
          continue;
        }
        
        // Add user references
        item.createdBy = req.user.id;
        item.updatedBy = req.user.id;
        
        // Check if data for this year already exists
        const existingEmission = await Emission.findOne({ year: item.year });
        
        if (existingEmission) {
          if (overwrite) {
            // Update the existing record
            const { _id, ...updateData } = item;
            const updated = await Emission.findOneAndUpdate(
              { year: item.year },
              updateData,
              { new: true, runValidators: true }
            );
            
            results.updated.push({
              year: item.year,
              id: updated._id
            });
          } else {
            // Skip this record
            results.errors.push({
              year: item.year,
              message: 'Record already exists and overwrite is disabled'
            });
          }
        } else {
          // Create new record
          const newEmission = new Emission(item);
          const savedEmission = await newEmission.save();
          
          results.created.push({
            year: item.year,
            id: savedEmission._id
          });
        }
      } catch (err) {
        results.errors.push({
          year: item.year,
          message: err.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Import completed with ${results.created.length} created, ${results.updated.length} updated, and ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Bulk import emissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get summary statistics for emissions data (Public route)
exports.getEmissionStats = async (req, res) => {
  try {
    // Get overall emissions trends
    const emissions = await Emission.find()
      .sort({ year: 1 })
      .select('year scope1 scope2 scope3');
    
    // Return early if no data is available
    if (emissions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalYears: 0,
          totalEmissions: 0,
          latestYear: null,
          avgYearlyReduction: 0,
          scope1Percentage: 0,
          scope2Percentage: 0,
          scope3Percentage: 0
        }
      });
    }
    
    // Calculate statistics
    const latestEmission = emissions[emissions.length - 1];
    const firstEmission = emissions[0];
    
    // Total emissions in the latest year
    const totalEmissions = latestEmission.scope1 + latestEmission.scope2 + latestEmission.scope3;
    
    // Calculate yearly reduction (if more than one year)
    let avgYearlyReduction = 0;
    if (emissions.length > 1) {
      const firstTotal = firstEmission.scope1 + firstEmission.scope2 + firstEmission.scope3;
      const yearDifference = latestEmission.year - firstEmission.year;
      
      if (yearDifference > 0 && firstTotal > 0) {
        // Percentage reduction from first to latest year
        const totalReduction = ((firstTotal - totalEmissions) / firstTotal) * 100;
        // Average yearly reduction
        avgYearlyReduction = totalReduction / yearDifference;
      }
    }
    
    // Calculate scope percentages
    const stats = {
      totalYears: emissions.length,
      totalEmissions: totalEmissions,
      latestYear: latestEmission.year,
      avgYearlyReduction: avgYearlyReduction,
      scope1Percentage: totalEmissions > 0 ? (latestEmission.scope1 / totalEmissions) * 100 : 0,
      scope2Percentage: totalEmissions > 0 ? (latestEmission.scope2 / totalEmissions) * 100 : 0,
      scope3Percentage: totalEmissions > 0 ? (latestEmission.scope3 / totalEmissions) * 100 : 0,
      yearlyData: emissions.map(e => ({
        year: e.year,
        total: e.scope1 + e.scope2 + e.scope3,
        scope1: e.scope1,
        scope2: e.scope2,
        scope3: e.scope3
      }))
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get emission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};