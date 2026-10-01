const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    file: {
      originalName: String,
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);
