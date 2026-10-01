const mongoose = require('mongoose');

// A capstone-style project owned by a student/team within a classroom
// (distinct from Assignment, which is a single gradable task inside a project's lifecycle)
const projectSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    title: { type: String, required: true, trim: true },
    problemStatement: { type: String, required: true },
    category: { type: String, required: true },
    currentStage: { type: String, required: true },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['ongoing', 'completed', 'on-hold'], default: 'ongoing' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
