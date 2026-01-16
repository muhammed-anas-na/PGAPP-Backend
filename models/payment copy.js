import mongoose from 'mongoose';
const rentPaymentSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },

    pg_owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PGOwner',
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    rent_amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      default: 'paid',
    },

    paid_on: {
      type: Date,
      default: null,
    },

    payment_method: {
      type: String,
      enum: ['cash', 'upi', 'bank', 'other'],
      default: 'cash',
    },
  },
  { timestamps: true }
);

// prevent duplicate month entries
rentPaymentSchema.index({ tenant_id: 1, month: 1 }, { unique: true });

export default mongoose.model('RentPayment', rentPaymentSchema);
