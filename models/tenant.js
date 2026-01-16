import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    pg_owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PGOwner',
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    phone_number: {
      type: String,
      required: true,
    },

    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },

    room_name: {
      type: String,
      required: true,
    },

    bed_number: {
      type: Number,
      required: true,
    },

    joining_date: {
      type: Date,
      required: true,
    },

    rent_paid: {
      type: Boolean,
      default: false,
    },

    deposit_paid: {
      type: Boolean,
      default: false,
    },

    auto_reminder: {
      type: Boolean,
      default: false,
    },
    noticePeriod: {
      type: Boolean,
      default: false,
    },
    rent:{
        type: String
    },
    deposit:{
        type: String
    }

  },
  { timestamps: true }
);
export default mongoose.model('Tenant', tenantSchema);
