import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
  // export const upload = multer({ storage: storage })
  export const upload = multer({ 
    storage, 
})




//   import multer from "multer";

// // Set up multer storage options
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, `/public/temp`);
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname);
//   },
// });

// // Create a multer instance with the storage options
// export const upload = multer({ storage: storage })