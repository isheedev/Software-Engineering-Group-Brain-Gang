const express = require('express');
const path = require('path');
const multer = require('multer');
const app = express();

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../client")));
app.use('/uploads', express.static('uploads'));

app.post('/api/projects', upload.single('image'), (req, res) => {

    console.log("Body:", req.body);
    console.log("File:", req.file);

    res.status(200).json({
        message: "File uploaded successfully",
        file: req.file
    });

});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});