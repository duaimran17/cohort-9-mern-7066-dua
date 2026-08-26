import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteEditor from '../../components/NoteEditor';

// Module mocks

jest.mock('dompurify', () => ({ sanitize: (html) => html }));

// ErrorBanner 
jest.mock('../../components/ErrorBanner', () =>
  function ErrorBannerStub({ message }) {
    return <div role="alert">{message}</div>;
  }
);

// Shared helpers

const BASE_PROPS = {
  isOpen: true,
  initialNote: null,
  initialTags: [],
  onSave: jest.fn(),
  onCancel: jest.fn(),
  isSaving: false,
  externalError: null,
};

function renderEditor(overrides = {}) {
  const props = { ...BASE_PROPS, ...overrides };
  const user = userEvent.setup();
  render(<NoteEditor {...props} />);
  return { user, props };
}

function setCanvasContent(canvas, content) {
  Object.defineProperty(canvas, 'innerText', {
    configurable: true,
    get: () => content,
  });
  Object.defineProperty(canvas, 'innerHTML', {
    configurable: true,
    get: () => content,
  });
  Object.defineProperty(canvas, 'textContent', {
    configurable: true,
    get: () => content,
  });
  fireEvent.input(canvas);
}

// Tests

describe('NoteEditor — visibility', () => {
  it('renders nothing when isOpen is false', () => {
    render(<NoteEditor {...BASE_PROPS} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    renderEditor();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('NoteEditor — create mode UI', () => {
  it('shows "Create New Note" heading in create mode', () => {
    renderEditor();
    expect(
      screen.getByRole('heading', { name: /create new note/i })
    ).toBeInTheDocument();
  });

  it('renders the title input, tags input, and content canvas', () => {
    renderEditor();
    expect(screen.getByLabelText(/^note title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tags$/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /note content/i })).toBeInTheDocument();
  });

  it('renders "Save Note" (not "Update Note") in create mode', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /save note/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update note/i })).not.toBeInTheDocument();
  });
});

describe('NoteEditor — edit mode UI', () => {
  const EXISTING_NOTE = {
    _id: 'n42',
    title: 'My Existing Note',
    content: '<p>Existing content</p>',
    tags: ['react', 'testing'],
  };

  it('shows "Edit Note" heading when initialNote has an _id', () => {
    renderEditor({ initialNote: EXISTING_NOTE });
    expect(
      screen.getByRole('heading', { name: /edit note/i })
    ).toBeInTheDocument();
  });

  it('pre-fills the title input with the existing note title', () => {
    renderEditor({ initialNote: EXISTING_NOTE });
    expect(screen.getByLabelText(/^note title$/i)).toHaveValue('My Existing Note');
  });

  it('renders "Update Note" button in edit mode', () => {
    renderEditor({ initialNote: EXISTING_NOTE });
    expect(screen.getByRole('button', { name: /update note/i })).toBeInTheDocument();
  });

  it('displays existing tags as chips', () => {
    renderEditor({ initialNote: EXISTING_NOTE });
    expect(screen.getByText('#react')).toBeInTheDocument();
    expect(screen.getByText('#testing')).toBeInTheDocument();
  });
});

describe('NoteEditor — validation', () => {
  it('shows an error alert when title is empty on submit', async () => {
    try {
      const { user } = renderEditor();
      const canvas = screen.getByRole('textbox', { name: /note content/i });
      setCanvasContent(canvas, '');
      await user.click(screen.getByRole('button', { name: /save note/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/enter a note title/i);
    } catch (error) {
      throw new Error(`Failed asserting title-empty validation in NoteEditor: ${error.message}`);
    }
  });

  it('shows an error alert when content is empty on submit', async () => {
    try {
      const { user } = renderEditor();
      await user.type(screen.getByLabelText(/^note title$/i), 'My Title');

      const canvas = screen.getByRole('textbox', { name: /note content/i });
      setCanvasContent(canvas, '');
      fireEvent.submit(canvas.closest('form'));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/enter note content/i)
      );
    } catch (error) {
      throw new Error(`Failed asserting content-empty validation in NoteEditor: ${error.message}`);
    }
  });
});

describe('NoteEditor — successful save', () => {
  it('calls onSave with the note data when form is valid', async () => {
    try {
      const onSave = jest.fn();

      const existingNote = {
        _id: 'n99',
        title: 'Pre-filled Title',
        content: '<p>Pre-filled content</p>',
        tags: [],
      };
      const { user } = renderEditor({ onSave, initialNote: existingNote });

      const canvas = screen.getByRole('textbox', { name: /note content/i });
      setCanvasContent(canvas, 'Pre-filled content');

      await user.click(screen.getByRole('button', { name: /update note/i }));

      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Pre-filled Title' })
        )
      );
    } catch (error) {
      throw new Error(`Failed asserting onSave payload in NoteEditor: ${error.message}`);
    }
  });
});

describe('NoteEditor — tag management', () => {
  it('adds a tag on Enter key in the tag input', async () => {
    try {
      const { user } = renderEditor();
      const tagInput = screen.getByLabelText(/^tags$/i);

      await user.type(tagInput, 'mytag{Enter}');

      expect(screen.getByText('#mytag')).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting tag add on Enter in NoteEditor: ${error.message}`);
    }
  });

  it('adds a tag on comma key in the tag input', async () => {
    try {
      const { user } = renderEditor();
      const tagInput = screen.getByLabelText(/^tags$/i);

      await user.type(tagInput, 'worktag,');

      expect(screen.getByText('#worktag')).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting tag add on comma in NoteEditor: ${error.message}`);
    }
  });

  it('removes a tag when its × button is clicked', async () => {
    try {
      const { user } = renderEditor({
        initialNote: { _id: 'n1', title: 'T', content: 'C', tags: ['removeme'] },
      });

      expect(screen.getByText('#removeme')).toBeInTheDocument();
      await user.click(screen.getByTitle(/remove #removeme/i));
      expect(screen.queryByText('#removeme')).not.toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting tag removal in NoteEditor: ${error.message}`);
    }
  });

  it('does not add a duplicate tag', async () => {
    try {
      const { user } = renderEditor({
        initialNote: { _id: 'n1', title: 'T', content: 'C', tags: ['dup'] },
      });

      await user.type(screen.getByLabelText(/^tags$/i), 'dup{Enter}');

      // Only one chip for "dup" should exist
      expect(screen.getAllByText('#dup')).toHaveLength(1);
    } catch (error) {
      throw new Error(`Failed asserting duplicate tag prevention in NoteEditor: ${error.message}`);
    }
  });
});

describe('NoteEditor — cancel behaviour', () => {
  it('calls onCancel when the Cancel button is clicked', async () => {
    try {
      const onCancel = jest.fn();
      const { user } = renderEditor({ onCancel });
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    } catch (error) {
      throw new Error(`Failed asserting Cancel button callback in NoteEditor: ${error.message}`);
    }
  });

  it('calls onCancel when the close (×) icon button is clicked', async () => {
    try {
      const onCancel = jest.fn();
      const { user } = renderEditor({ onCancel });
      await user.click(screen.getByRole('button', { name: /close editor/i }));
      expect(onCancel).toHaveBeenCalled();
    } catch (error) {
      throw new Error(`Failed asserting close icon callback in NoteEditor: ${error.message}`);
    }
  });
});

describe('NoteEditor — saving state', () => {
  it('disables Save and Cancel buttons while isSaving is true', () => {
    renderEditor({ isSaving: true });
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('shows the externalError from the parent when provided', () => {
    renderEditor({ externalError: 'Server rejected the note.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/server rejected/i);
  });
});
