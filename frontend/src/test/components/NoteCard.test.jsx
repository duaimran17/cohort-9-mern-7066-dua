import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteCard from '../../components/NoteCard';


// Module mocks


// DOMPurify 
jest.mock('dompurify', () => ({ sanitize: (html) => html }));

// notesStorage 
jest.mock('../../utils/notesStorage', () => ({
  getRetentionTimeLeft: jest.fn(() => '6 days left'),
}));

// Shared fixtures

const BASE_NOTE = {
  _id: 'n1',
  title: 'My Test Note',
  content: '<p>Hello world content</p>',
  updatedAt: '2025-01-15T10:00:00.000Z',
};

const BASE_PROPS = {
  note: BASE_NOTE,
  tags: [],
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  isTrashMode: false,
  onRestore: jest.fn(),
  onPermanentDelete: jest.fn(),
  onTagClick: jest.fn(),
};

function renderCard(overrides = {}) {
  const props = { ...BASE_PROPS, ...overrides };
  const user = userEvent.setup();
  render(<NoteCard {...props} />);
  return { user, props };
}


// Tests

describe('NoteCard — basic rendering', () => {
  it('renders the note title', () => {
    renderCard();
    expect(screen.getByText('My Test Note')).toBeInTheDocument();
  });

  it('renders note content as HTML via dangerouslySetInnerHTML', () => {
    renderCard();
    expect(screen.getByText('Hello world content')).toBeInTheDocument();
  });

  it('renders as an article element', () => {
    renderCard();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('shows formatted date when updatedAt is provided', () => {
    renderCard();

    const article = screen.getByRole('article');
    expect(article).toHaveTextContent(/Jan/i);
  });

  it('shows "Just now" when no date is available', () => {
    renderCard({ note: { ...BASE_NOTE, updatedAt: null, createdAt: null } });
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });
});

describe('NoteCard — normal mode actions', () => {
  it('shows Edit and Move-to-trash buttons in normal mode', () => {
    renderCard();
    expect(
      screen.getByRole('button', { name: /edit my test note/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /move my test note to trash/i })
    ).toBeInTheDocument();
  });

  it('calls onEdit when the Edit button is clicked', async () => {
    const onEdit = jest.fn();
    const { user } = renderCard({ onEdit });
    await user.click(screen.getByRole('button', { name: /edit my test note/i }));
    expect(onEdit).toHaveBeenCalledWith(BASE_NOTE);
  });

  it('calls onDelete when the Move-to-trash button is clicked', async () => {
    const onDelete = jest.fn();
    const { user } = renderCard({ onDelete });
    await user.click(
      screen.getByRole('button', { name: /move my test note to trash/i })
    );
    expect(onDelete).toHaveBeenCalledWith(BASE_NOTE);
  });

  it('calls onEdit when the title button is clicked', async () => {
    const onEdit = jest.fn();
    const { user } = renderCard({ onEdit });
    await user.click(
      screen.getByRole('button', { name: /open note: my test note/i })
    );
    expect(onEdit).toHaveBeenCalledWith(BASE_NOTE);
  });
});

describe('NoteCard — trash mode', () => {
  const TRASH_NOTE = {
    ...BASE_NOTE,
    deletedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  };

  it('shows Restore and Permanent-delete buttons in trash mode', () => {
    renderCard({ note: TRASH_NOTE, isTrashMode: true });
    expect(
      screen.getByRole('button', { name: /restore my test note/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /permanently delete my test note/i })
    ).toBeInTheDocument();
  });

  it('does NOT show Edit or Move-to-trash buttons in trash mode', () => {
    renderCard({ note: TRASH_NOTE, isTrashMode: true });
    expect(
      screen.queryByRole('button', { name: /edit my test note/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /move my test note to trash/i })
    ).not.toBeInTheDocument();
  });

  it('calls onRestore when the Restore button is clicked', async () => {
    const onRestore = jest.fn();
    const { user } = renderCard({ note: TRASH_NOTE, isTrashMode: true, onRestore });
    await user.click(screen.getByRole('button', { name: /restore my test note/i }));
    expect(onRestore).toHaveBeenCalledWith(TRASH_NOTE);
  });

  it('calls onPermanentDelete when the permanent-delete button is clicked', async () => {
    const onPermanentDelete = jest.fn();
    const { user } = renderCard({
      note: TRASH_NOTE,
      isTrashMode: true,
      onPermanentDelete,
    });
    await user.click(
      screen.getByRole('button', { name: /permanently delete my test note/i })
    );
    expect(onPermanentDelete).toHaveBeenCalledWith(TRASH_NOTE);
  });

  it('displays retention time from getRetentionTimeLeft', () => {
    renderCard({ note: TRASH_NOTE, isTrashMode: true });
    expect(screen.getByText('6 days left')).toBeInTheDocument();
  });

  it('shows the note title as a plain span (not a clickable button) in trash mode', () => {
    renderCard({ note: TRASH_NOTE, isTrashMode: true });

    expect(
      screen.queryByRole('button', { name: /open note: my test note/i })
    ).not.toBeInTheDocument();
    // Title text 
    expect(screen.getByText('My Test Note')).toBeInTheDocument();
  });
});

describe('NoteCard — tags', () => {
  it('renders a button for each tag', () => {
    renderCard({ tags: ['react', 'testing'] });
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });

  it('calls onTagClick with the tag name when a tag is clicked', async () => {
    const onTagClick = jest.fn();
    const { user } = renderCard({ tags: ['react'], onTagClick });
    await user.click(screen.getByTitle(/filter notes with #react/i));
    expect(onTagClick).toHaveBeenCalledWith('react');
  });

  it('renders no tag buttons when tags array is empty', () => {
    renderCard({ tags: [] });
    expect(screen.queryByTitle(/filter notes with/i)).not.toBeInTheDocument();
  });

  it('prefers note.tags over the tags prop', () => {
    renderCard({
      note: { ...BASE_NOTE, tags: ['from-note'] },
      tags: ['from-prop'],
    });
    expect(screen.getByText('from-note')).toBeInTheDocument();
  });
});
