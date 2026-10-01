const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    files: [fileSchema],
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'submitted', 'late', 'graded'], default: 'pending' },
    submittedAt: { type: Date },
    marks: { type: Number, default: null },
    feedback: { type: String, default: '' },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
