const bcrypt = require('bcryptjs');
const otpGenerator = require('otp-generator');

module.exports = {
  generateOTP: () => {
    return otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false
    });
  },
  
  verifyOTP: async (user, otp) => {
    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return false;
    }
    
    const isMatch = await bcrypt.compare(otp, user.otp.code);
    const isExpired = new Date() > new Date(user.otp.expiresAt);
    
    return isMatch && !isExpired;
  }
};