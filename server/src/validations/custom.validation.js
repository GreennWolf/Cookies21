const mongoose = require('mongoose');

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message('{{#label}} debe ser un ID válido de MongoDB');
  }
  return value;
};

module.exports = {
  objectId,
};