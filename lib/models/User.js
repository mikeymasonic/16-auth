const mongoose = require('mongoose');
const { hashSync, compare } = require('bcryptjs');
const { sign, verify } = require('jsonwebtoken');

const schema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
    }
  }
});

schema.virtual('password').set(function(password) {
  const hash = hashSync(password, Number(process.env.SALT_ROUNDS) || 14);
  this.passwordHash = hash;
});

schema.statics.authenticate = async function({ email, password }){
  const user = await this.findOne({ email });
  if(!user) {
    const err = new Error('Invalid Email/Password');
    err.status = 401;
    throw err;
  }

  const validPassword = await compare(password, user.passwordHash);
  if(!validPassword) {
    const err = new Error('Invalid Email/Password');
    err.status = 401;
    throw err;
  }

  return user;
};

schema.methods.authToken = function() {
  const token = sign({ payload: this.toJSON() }, process.env.APP_SECRET);
  return token;
};

schema.statics.findByToken = function(token) {
  try {
    const { payload } = verify(token, process.env.APP_SECRET);

    return Promise.resolve(this.hydrate(payload));
  } catch(e) {
    return Promise.reject(e);
  }
};

module.exports = mongoose.model('User', schema);
