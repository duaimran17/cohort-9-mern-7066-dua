const Note = require('../models/Note');
const logger = require('../utils/logger');

// POST api notes 
exports.createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = await Note.create({
      title,
      content,
      owner: req.user._id, // protected middleware
    });

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note created');
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};

// GET logged user ntoes
exports.getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(notes);
  } catch (err) {
    next(err);
  }
};

// GET api notes and id
exports.getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json(note);
  } catch (err) {
    next(err);
  }
};

// PUT my notes api iddd
exports.updateNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;

    await note.save();

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note updated');
    res.status(200).json(note);
  } catch (err) {
    next(err);
  }
};

// DELETE 
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    logger.info({ noteId: req.params.id, userId: req.user._id }, 'Note deleted');
    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (err) {
    next(err);
  }
};