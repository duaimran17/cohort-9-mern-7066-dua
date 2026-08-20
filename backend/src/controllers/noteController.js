const Note = require('../models/Note');
const logger = require('../utils/logger');

// POST api notes 
exports.createNote = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { title, content } = req.body;

    if (
      typeof title !== 'string' ||
      typeof content !== 'string' ||
      title.trim() === '' ||
      content.trim() === ''
    ) {
      return res.status(400).json({ message: 'Title and content must be non-empty strings' });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      owner: req.user._id, // protected middleware
    });

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note created');
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};

// GET logged user notes
exports.getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(notes);
  } catch (err) {
    next(err);
  }
};

// GET api notes by id
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

// PUT update note
exports.updateNote = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { title, content } = req.body;
    const hasTitle = Object.prototype.hasOwnProperty.call(req.body, 'title');
    const hasContent = Object.prototype.hasOwnProperty.call(req.body, 'content');

    if (!hasTitle && !hasContent) {
      return res.status(400).json({ message: 'Provide title or content to update' });
    }

    if (hasTitle && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ message: 'Title must be a non-empty string' });
    }

    if (hasContent && (typeof content !== 'string' || content.trim() === '')) {
      return res.status(400).json({ message: 'Content must be a non-empty string' });
    }

    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (hasTitle) note.title = title.trim();
    if (hasContent) note.content = content.trim();

    await note.save();

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note updated');
    res.status(200).json(note);
  } catch (err) {
    next(err);
  }
};

// DELETE note
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