const mongoose = require('mongoose');

const CATEGORIES = ['SDP', 'EDI', 'DT', 'Course Project'];

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    coverColor: { type: String, default: '#4f46e5' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

classroomSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Classroom', classroomSchema);
