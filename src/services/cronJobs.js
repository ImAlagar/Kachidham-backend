// In a separate file like cronJobs.js
import cron from 'node-cron';
import productService from './services/productService.js';

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    await productService.autoMarkNewArrivals();
    await productService.autoUpdateBestSellers();
  } catch (error) {
    console.error('Error in merchandising auto-update:', error);
  }
});