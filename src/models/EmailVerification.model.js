import mongoose from 'mongoose';

const { Schema } = mongoose;

const EmailVerificationSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    email: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expiredIn: {
        type: Date,
        required: true
    }
});

const EmailVerification = mongoose.model('EmailVerification', EmailVerificationSchema);

export default EmailVerification;