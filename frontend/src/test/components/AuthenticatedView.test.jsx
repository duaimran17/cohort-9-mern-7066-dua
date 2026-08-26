import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthenticatedView from '../../components/AuthenticatedView';

jest.mock('../../api/notesApi', () => ({
  fetchNotes: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  extractApiErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
}));

// authApi 
jest.mock('../../api/authApi', () => ({
  logoutUser: jest.fn(),
  removeAuthData: jest.fn(),
}));

// notesStorage 
jest.mock('../../utils/notesStorage', () => ({
  loadTagsMap: jest.fn(() => ({})),
  saveNoteTags: jest.fn(),
  removeNoteTags: jest.fn(),
  loadTrashNotes: jest.fn(() => []),
  moveNoteToTrash: jest.fn(() => []),
  removeFromTrash: jest.fn(() => []),
  emptyTrashStorage: jest.fn(),
  exportNotesToJson: jest.fn(),
  parseImportFile: jest.fn(),
}));

jest.mock('../../components/NoteCard', () =>
  function NoteCardStub({ note }) {
    return <div data-testid="note-card">{note.title}</div>;
  }
);
jest.mock('../../components/NoteEditor', () =>
  function NoteEditorStub({ isOpen }) {
    return isOpen ? <div data-testid="note-editor-modal" /> : null;
  }
);
jest.mock('../../components/DeleteConfirmModal', () =>
  function DeleteConfirmModalStub({ isOpen }) {
    return isOpen ? <div data-testid="delete-confirm-modal" /> : null;
  }
);
jest.mock('../../components/ExportModal', () =>
  function ExportModalStub({ isOpen }) {
    return isOpen ? <div data-testid="export-modal" /> : null;
  }
);
jest.mock('../../components/ErrorBanner', () =>
  function ErrorBannerStub({ message }) {
    return <div role="alert">{message}</div>;
  }
);

import { fetchNotes } from '../../api/notesApi';
import { logoutUser, removeAuthData } from '../../api/authApi';

// Shared fixtures

const FAKE_USER = { _id: 'u1', name: 'Alice', email: 'alice@example.com' };
const FAKE_TOKEN = 'tok_test';

const NOTE_A = { _id: 'n1', title: 'Alpha Note', content: 'Hello world', tags: [] };
const NOTE_B = { _id: 'n2', title: 'Beta Note', content: 'Second note', tags: [] };

function renderDashboard(props = {}) {
  const onLogout = jest.fn();
  const user = userEvent.setup();
  render(
    <AuthenticatedView
      user={FAKE_USER}
      token={FAKE_TOKEN}
      onLogout={onLogout}
      {...props}
    />
  );
  return { user, onLogout };
}

// Tests

describe('AuthenticatedView — loading state', () => {
  it('shows a loading skeleton while fetch is in-flight', () => {
    fetchNotes.mockReturnValue(new Promise(() => { }));
    renderDashboard();

    expect(screen.getByLabelText(/loading notes/i)).toBeInTheDocument();
  });
});

describe('AuthenticatedView — notes list', () => {
  beforeEach(() => {
    fetchNotes.mockResolvedValue([NOTE_A, NOTE_B]);
  });

  it('renders a NoteCard for each fetched note', async () => {
    try {
      renderDashboard();
      await waitFor(() =>
        expect(screen.getAllByTestId('note-card')).toHaveLength(2)
      );
      expect(screen.getByText('Alpha Note')).toBeInTheDocument();
      expect(screen.getByText('Beta Note')).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting rendered NoteCard list in AuthenticatedView: ${error.message}`);
    }
  });

  it('displays the correct total count pill', async () => {
    try {
      renderDashboard();
      await waitFor(() => screen.getAllByTestId('note-card'));
      expect(screen.getByText(/2 total/i)).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting total notes count pill in AuthenticatedView: ${error.message}`);
    }
  });
});

describe('AuthenticatedView — empty state', () => {
  beforeEach(() => {
    fetchNotes.mockResolvedValue([]);
  });

  it('shows the empty-state prompt when there are no notes', async () => {
    try {
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
      );
    } catch (error) {
      throw new Error(`Failed asserting empty notes prompt in AuthenticatedView: ${error.message}`);
    }
  });

  it('renders the "Create your first note" button in empty state', async () => {
    try {
      renderDashboard();
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /create your first note/i })
        ).toBeInTheDocument()
      );
    } catch (error) {
      throw new Error(`Failed asserting empty-state create button in AuthenticatedView: ${error.message}`);
    }
  });
});

describe('AuthenticatedView — API error banner', () => {
  it('shows an error alert when fetchNotes rejects', async () => {
    try {
      fetchNotes.mockRejectedValue({ message: 'Network failure' });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/network failure/i)
      );
    } catch (error) {
      throw new Error(`Failed asserting API error banner on fetch failure in AuthenticatedView: ${error.message}`);
    }
  });
});

describe('AuthenticatedView — search filter', () => {
  beforeEach(() => {
    fetchNotes.mockResolvedValue([NOTE_A, NOTE_B]);
  });

  it('filters notes as the user types in the search box', async () => {
    try {
      const { user } = renderDashboard();
      await waitFor(() => screen.getAllByTestId('note-card'));

      await user.type(
        screen.getByRole('textbox', { name: /search notes/i }),
        'Alpha'
      );

      await waitFor(() =>
        expect(screen.getAllByTestId('note-card')).toHaveLength(1)
      );
      expect(screen.getByText('Alpha Note')).toBeInTheDocument();
      expect(screen.queryByText('Beta Note')).not.toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting search input filtering in AuthenticatedView: ${error.message}`);
    }
  });

  it('shows the no-results empty state when search matches nothing', async () => {
    try {
      const { user } = renderDashboard();
      await waitFor(() => screen.getAllByTestId('note-card'));

      await user.type(
        screen.getByRole('textbox', { name: /search notes/i }),
        'zzznomatch'
      );

      await waitFor(() =>
        expect(screen.getByText(/no notes found/i)).toBeInTheDocument()
      );
    } catch (error) {
      throw new Error(`Failed asserting no search results empty state in AuthenticatedView: ${error.message}`);
    }
  });
});

describe('AuthenticatedView — New Note button', () => {
  beforeEach(() => {
    fetchNotes.mockResolvedValue([NOTE_A]);
  });

  it('opens the NoteEditor modal when "New Note" is clicked', async () => {
    try {
      const { user } = renderDashboard();
      await waitFor(() => screen.getByTestId('note-card'));

      expect(screen.queryByTestId('note-editor-modal')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /new note/i }));
      expect(screen.getByTestId('note-editor-modal')).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting New Note button triggers editor in AuthenticatedView: ${error.message}`);
    }
  });
});

describe('AuthenticatedView — logout', () => {
  beforeEach(() => {
    fetchNotes.mockResolvedValue([]);
    logoutUser.mockResolvedValue({});
  });

  it('calls logoutUser and then onLogout when Log Out is clicked', async () => {
    try {
      const { user, onLogout } = renderDashboard();
      await waitFor(() => screen.getByText(/no notes yet/i));

      await user.click(screen.getByRole('button', { name: /log out/i }));

      await waitFor(() => expect(logoutUser).toHaveBeenCalledWith(FAKE_TOKEN));
      await waitFor(() => expect(removeAuthData).toHaveBeenCalled());
      await waitFor(() => expect(onLogout).toHaveBeenCalled());
    } catch (error) {
      throw new Error(`Failed asserting logout flow in AuthenticatedView: ${error.message}`);
    }
  });
});
