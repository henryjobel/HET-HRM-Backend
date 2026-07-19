const express = require('express');
const router = express.Router();
const { getMessages, createMessage } = require('../controllers/discussionController');
const { protectDiscussion } = require('../middleware/discussionAuthMiddleware');

router.use(protectDiscussion);

router.get('/messages', getMessages);
router.post('/messages', createMessage);

module.exports = router;
