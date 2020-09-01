const router = require('express').Router(),
  jwt = require('jsonwebtoken'),
  User = require('../../db/models/user'),
  Question = require('../../db/models/question');

/**
 * OPEN USER ROUTES
 */

// Create a user
router.post('/api/users/', async (req, res) => {
  const { email } = req.body;
  let user = await User.findOne({ email });
  console.log(req.body);
  if (user)
    throw new Error('an account already exists associated with that email');
  try {
    user = new User({
      email,
      ...req.body
    });

    const token = await user.generateAuthToken();
    res.cookie('jwt', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV !== 'production' ? false : true
    });
    // we don't have this method
    // sendWelcomeEmail(user.email, user.name);
    res.status(201).json(user);
  } catch (error) {
    res.status(401).json({ error: error.toString() });
  }
});

// Login a user
router.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();
    res.cookie('jwt', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV !== 'production' ? false : true
    });
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.toString() });
  }
});

// Password Reset Request
// Sends user email that they have ten minutes to click
router.get('/api/password', async (req, res) => {
  try {
    const { email } = req.query,
      user = await User.findOne({ email });
    if (!user) throw new Error("account doesn't exist");
    const token = jwt.sign(
      { _id: user._id.toString(), name: user.name },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m'
      }
    );
    // this is not defined
    // forgotPasswordEmail(email, token);
    res.json({ message: 'reset password email sent' });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Redirect to password reset page
router.get('/api/password/:token', (req, res) => {
  const { token } = req.params;
  try {
    jwt.verify(token, process.env.JWT_SECRET, function (err) {
      if (err) throw new Error(err.message);
    });
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 600000,
      sameSite: 'Strict'
    });
    res.redirect(process.env.URL + '/update-password');
  } catch (error) {
    res.status(401).json({ error: error.toString() });
  }
});

/**
 * OPEN QUESTIONS/ANSWER ROUTES
 */

// Get all questions
router.get('/questions', (_, res) => {
  Question.find().then((questions) =>
    res.json(questions).catch((err) => res.status(500).json('Error: ', err))
  );
});

// Get a specific question

// Get all answers to a specific question
router.get('/question/:qId', (req, res) => {
  Question.findById(req.params.qId)
    .populate('answers')
    .exec()
    .then((questionWithAnswers) => {
      res.json(questionWithAnswers);
    })
    .catch((err) => res.status(500).json('Error: ', err));
});

module.exports = router;
