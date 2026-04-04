const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store file in memory — we upload the buffer to Cloudinary manually
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, png and webp images are allowed'));
    }
  },
});

// Helper: upload a buffer to Cloudinary and return { url, publicId }
const uploadToCloudinary = (buffer, folder = 'het-hrm/products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// Helper: delete image from Cloudinary by publicId
const deleteFromCloudinary = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
