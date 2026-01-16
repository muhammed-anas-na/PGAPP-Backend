import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: Number,
      required: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    occupantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    pg_owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PGOwner',
      required: true,
    },

    room_name: {
      type: String,
      required: true,
    },

    totalBeds: {
      type: Number,
      required: true,
      min: 1,
    },

    beds: {
      type: [bedSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);

