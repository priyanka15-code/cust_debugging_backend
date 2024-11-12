const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  pName: {
    type: String,
    required: true
  },
  pDescription: {
    type: String,
    required: true,
  },
  pId: {
    type: String,
    
  },
  pPrice: {
    type: String,
    required: true
  },
  pQuantity: {
    type: String, 
    required:true
  },
  barcode: { 
    type: String 
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  }
});


productSchema.index({ pName: 'text', pDescription: 'text', pId: 'text', pPrice: 'text', pQuantity: 'text', customerId: 'text' });
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
