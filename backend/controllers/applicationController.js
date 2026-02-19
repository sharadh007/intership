const { v4: uuidv4 } = require('uuid');

// Simulated applications database (in production, use actual database)
let applications = [];

// Submit new application
const submitApplication = (req, res) => {
  try {
    const { studentId, internshipId, coverLetter } = req.body;

    // Validation
    if (!studentId || !internshipId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['studentId', 'internshipId']
      });
    }

    // Check if student already applied to this internship
    const existingApplication = applications.find(
      app => app.studentId === studentId && app.internshipId === internshipId
    );

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        error: 'Student has already applied to this internship',
        applicationId: existingApplication.id
      });
    }

    const newApplication = {
      id: uuidv4(),
      studentId,
      internshipId,
      coverLetter: coverLetter || '',
      status: 'Applied', // Applied, Under Review, Shortlisted, Rejected, Accepted
      appliedAt: new Date(),
      updatedAt: new Date()
    };

    applications.push(newApplication);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: newApplication
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error submitting application',
      message: error.message
    });
  }
};

// Get all applications for a student
const getStudentApplications = (req, res) => {
  try {
    const { studentId } = req.params;

    const studentApplications = applications.filter(
      app => app.studentId === studentId
    );

    res.json({
      success: true,
      studentId,
      count: studentApplications.length,
      data: studentApplications
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching student applications',
      message: error.message
    });
  }
};

// Get all applications for an internship
const getInternshipApplications = (req, res) => {
  try {
    const { internshipId } = req.params;

    const internshipApplications = applications.filter(
      app => app.internshipId === internshipId
    );

    res.json({
      success: true,
      internshipId,
      count: internshipApplications.length,
      data: internshipApplications
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching internship applications',
      message: error.message
    });
  }
};

// Get single application by ID
const getApplicationById = (req, res) => {
  try {
    const { id } = req.params;

    const application = applications.find(app => app.id === id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        id: id
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching application',
      message: error.message
    });
  }
};

// Update application status
const updateApplicationStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Rejected', 'Accepted'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses: validStatuses
      });
    }

    const application = applications.find(app => app.id === id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        id: id
      });
    }

    application.status = status;
    application.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating application status',
      message: error.message
    });
  }
};

// Delete application
const deleteApplication = (req, res) => {
  try {
    const { id } = req.params;

    const applicationIndex = applications.findIndex(app => app.id === id);

    if (applicationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        id: id
      });
    }

    const deletedApplication = applications.splice(applicationIndex, 1);

    res.json({
      success: true,
      message: 'Application deleted successfully',
      data: deletedApplication[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting application',
      message: error.message
    });
  }
};

// Get application statistics
const getApplicationStats = (req, res) => {
  try {
    const totalApplications = applications.length;
    const statusBreakdown = {
      applied: applications.filter(app => app.status === 'Applied').length,
      underReview: applications.filter(app => app.status === 'Under Review').length,
      shortlisted: applications.filter(app => app.status === 'Shortlisted').length,
      rejected: applications.filter(app => app.status === 'Rejected').length,
      accepted: applications.filter(app => app.status === 'Accepted').length
    };

    res.json({
      success: true,
      totalApplications,
      statusBreakdown
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching application statistics',
      message: error.message
    });
  }
};

module.exports = {
  submitApplication,
  getStudentApplications,
  getInternshipApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats
};
