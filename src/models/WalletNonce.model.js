import mongoose from "mongoose";

const walletNonceSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  nonce: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  },
  used: {
    type: Boolean,
    default: false,
  },
});

// Method to check if nonce is expired
walletNonceSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() || this.used;
};

// Create TTL index that will automatically remove expired documents
walletNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WalletNonce = mongoose.model("WalletNonce", walletNonceSchema);

export default WalletNonce;
