import mongoose from 'mongoose';

const pgOwnerSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
      index: true,
    },

    pgName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('PgOwner', pgOwnerSchema);
