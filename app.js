// Imports
const express = require('express');
const User = require('./database');
const ResetPassword = require('./Models/ResetPasswordModel');
const app = express();
const port = 5000;
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { PythonShell } = require('python-shell');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// Middlewares
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

// Routes
app.get('', (req, res) => {
  res.render('welcome');
});
app.get('/form', (req, res) => {
  res.render('form');
});
app.post('/form', upload.single('image'), async (req, res) => {
  try {
    const { fullName, phoneNumber, age, date, chronicDisease, gender } = req.body;
    const imagePath = req.file.path;

    const user = new User({
      fullName: fullName,
      phoneNumber: phoneNumber,
      age: age,
      date: date,
      chronicDisease: chronicDisease,
      gender: gender,
      imagePath: imagePath,
    });

    const savedUser = await user.save();
    console.log('Patient data saved successfully');
    console.log('Full Name:', savedUser.fullName);
    console.log('Phone Number:', savedUser.phoneNumber);
    console.log('Age:', savedUser.age);
    console.log('Date:', savedUser.date);
    console.log('Chronic Disease:', savedUser.chronicDisease);
    console.log('Gender:', savedUser.gender);
    console.log('Image Path:', savedUser.imagePath);
    const pyshell = new PythonShell('predict.py');
    pyshell.send(imagePath);

    pyshell.on('message', (result) => {
      res.json({ result });
    });

    pyshell.end((err) => {
      if (err) {
        console.error(err);
      }
    });
    const filePath = 'patients.xlsx';
    let workbook;

    if (fs.existsSync(filePath)) {
      workbook = await new ExcelJS.Workbook().xlsx.readFile(filePath);
    } else {
      workbook = new ExcelJS.Workbook();
      workbook.creator = 'Your Name';
      workbook.created = new Date();
      workbook.addWorksheet('Patients').addRow(['Full Name', 'Phone Number', 'Age', 'Date', 'Chronic Disease', 'Gender', 'Image Path']);
    }

    const worksheet = workbook.getWorksheet('Patients');
    worksheet.addRow([
      savedUser.fullName,
      savedUser.phoneNumber,
      savedUser.age,
      savedUser.date,
      savedUser.chronicDisease,
      savedUser.gender,
      savedUser.imagePath,
    ]);

    await workbook.xlsx.writeFile(filePath);
    console.log('Patient data saved to Excel successfully');

    res.status(201).json({ message: 'Patient data saved successfully' });
  } catch (error) {
    console.error('Failed to save patient data', error);
    res.status(500).json({ error: 'Failed to save patient data' });
  }
});

app.get('/sign_in', (req, res) => {
  res.render('sign_in');
});

app.post('/sign_in', (req, res) => {
  const { emailAddress, password } = req.body;

  User.findOne({ emailAddress: emailAddress })
    .then(user => {
      if (!user) {
        return res.status(401).send('Invalid credentials');
      }

      if (user.password !== password) {
        return res.status(401).send('Invalid credentials');
      }

      res.send('User logged in successfully');
      res.render('home')
    })
    .catch(err => {
      console.log('Failed to authenticate user');
      res.status(500).send('Failed to authenticate user');
    });
});

app.get('/home', (req, res) => {
  res.render('home');
});
app.get('/sign_up', (req, res) => {
  res.render('sign_up');
});

app.post('/sign_up', (req, res) => {
  const { fullName, emailAddress, password } = req.body;

  // Check if the email address is already registered
  User.findOne({ emailAddress: emailAddress })
    .then(existingUser => {
      if (existingUser) {
        console.log('Email address already registered');
        // Email address already registered
        return res.status(409).send('Email address already registered');
      }

      // Create a new user instance
      const user = new User({
        fullName: fullName,
        emailAddress: emailAddress,
        password: password,
      });

      // Save the user to the database
      user.save()
        .then(savedUser => {
          console.log('User registered successfully');
          console.log('Full Name:', savedUser.fullName);
          console.log('Email Address:', savedUser.emailAddress);
          console.log('Password:', savedUser.password);
          res.render('sign_in');
        })
        .catch(err => {
          console.log('Failed to register user');
          res.status(500).send('Failed to register user');
        });
    })
    .catch(err => {
      res.status(500).send('Failed to register user');
    });
});

app.get('/forgetpassword', (req, res) => {
  res.render('forgetpassword');
});
app.post('/forgetpassword', (req, res) => {
  const { emailAddress } = req.body;

  const resetPassword = new ResetPassword({ emailAddress });

  resetPassword.save()
    .then(() => {
      console.log('Reset password email sent successfully');
      res.send('Reset password email sent successfully');
    })
    .catch((err) => {
      console.error('Failed to send reset password email', err);
      res.status(500).send('Failed to send reset password email');
    });
});


app.post('/predict', upload.single('image'), (req, res) => {
  // Get the path of the uploaded image
  const imagePath = req.file.path;

  // Set up the PythonShell with the path to your Python script
  const pyshell = new PythonShell('predict.py');

  // Pass the image path to the Python script
  pyshell.send(imagePath);

  // Receive the predicted result from the Python script
  pyshell.on('message', (result) => {
    // Send the result back as the API response
    res.json({ result });
  });

  // End the PythonShell process
  pyshell.end((err) => {
    if (err) {
      console.error(err);
    }
  });
});
// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
