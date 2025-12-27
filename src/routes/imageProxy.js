// routes/imageProxy.js
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Image proxy endpoint
router.get('/proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Set appropriate headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Stream the image data
    const buffer = await response.buffer();
    res.send(buffer);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error.message 
    });
  }
});

export default router;