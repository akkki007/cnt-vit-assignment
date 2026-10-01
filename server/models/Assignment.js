const mongoose = require('mongoose');

// Workflow stages per academic category - drives badges/progress on the UI
const STAGES_BY_CATEGORY = {
  SDP: ['Requirements', 'Design', 'Development', 'Testing'],
  EDI: ['Research', 'Ideation', 'Design', 'Prototype'],
  DT: ['Empathize', 'Define', 'Ideate', 'Prototype', 'Test'],
  'Course Project': ['Assignment'],
};

const assignmentSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    stage: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    deadline: { type: Date, required: true },
    resources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

assignmentSchema.statics.STAGES_BY_CATEGORY = STAGES_BY_CATEGORY;

module.exports = mongoose.model('Assignment', assignmentSchema);
