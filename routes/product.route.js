const express = require('express');
const router = express.Router();
const bwipjs = require('bwip-js');
const Product = require('../models/product.model');
const verifyToken = require('../middelwares/auth');
const { initRedisClient } = require('../utils/redis');

router.use(verifyToken); 

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET products by customer ID
router.get('/byid', async (req, res) => {
    const customerId = req.user ? req.user._id : null; 

    if (!customerId) {
        return res.status(403).json({ message: 'User not authenticated' });
    }

    try {
        const products = await Product.find({ customerId }); 
        res.json(products);
    } catch (err) {
        console.error('Error fetching products by customer ID:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST create a new Product
router.post('/', async (req, res) => {
    const { pName, pDescription, pPrice, pQuantity } = req.body;
    const customerId = req.user ? req.user._id : null; 

    if (!customerId) {
        return res.status(403).json({ message: 'User not authenticated' });
    }

    try {
        let newProduct = new Product({
            pName,
            pDescription,
            pPrice,
            pQuantity,
            customerId
        });

        // Redis logic for product ID
        const redisClient = await initRedisClient();
        const uniqueProductId = await redisClient.incr('product:id');
        const pId = `0000${uniqueProductId}`.slice(-4); // Ensure 4 digits

        newProduct.pId = pId;

        // Barcode generation
        const barcodeBuffer = await bwipjs.toBuffer({
            bcid: 'code128',
            text: pId,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
        });
        const barcodeImage = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
        newProduct.barcode = barcodeImage;

        await newProduct.save();
        return res.status(201).json({
            message: 'Product created successfully',
            Product: newProduct,
        });
    } catch (error) {
        console.error('Error creating Product:', error);
        return res.status(500).json({ message: 'Internal server error while creating product' });
    }
});

module.exports = router;
