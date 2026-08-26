import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportModal from '../../components/ExportModal';


// Shared fixtures


const NOTE_A = { _id: 'n1', title: 'Alpha Note', content: '<p>Hello</p>', tags: ['work'] };
const NOTE_B = { _id: 'n2', title: 'Beta Note', content: '<p>World</p>', tags: [] };
const NOTE_C = { _id: 'n3', title: 'Gamma Note', content: '<p>Third</p>', tags: ['idea'] };

const BASE_PROPS = {
  isOpen: true,
  notes: [NOTE_A, NOTE_B, NOTE_C],
  tagsMap: {},
  onExport: jest.fn(),
  onCancel: jest.fn(),
};

function renderModal(overrides = {}) {
  const props = { ...BASE_PROPS, ...overrides };
  const user = userEvent.setup();
  render(<ExportModal {...props} />);
  return { user, props };
}


// Tests


describe('ExportModal — visibility', () => {
  it('renders nothing when isOpen is false', () => {
    render(<ExportModal {...BASE_PROPS} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the "Export Notes" heading', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /export notes/i })).toBeInTheDocument();
  });
});

describe('ExportModal — cancel paths', () => {
  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = jest.fn();
    const { user } = renderModal({ onCancel });
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close (×) icon button is clicked', async () => {
    const onCancel = jest.fn();
    const { user } = renderModal({ onCancel });
    await user.click(screen.getByRole('button', { name: /close export dialog/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('ExportModal — "Export All" mode (default)', () => {
  it('defaults to "Export All Notes" radio selected', () => {
    renderModal();
    expect(screen.getByRole('radio', { name: /export all notes/i })).toBeChecked();
  });

  it('shows the correct note count in the export button label', () => {
    renderModal();
    // 3 notes → "Export 3 Notes"
    expect(
      screen.getByRole('button', { name: /export 3 notes/i })
    ).toBeInTheDocument();
  });

  it('calls onExport with ALL notes when Export button is clicked in all-mode', async () => {
    const onExport = jest.fn();
    const { user } = renderModal({ onExport });
    await user.click(screen.getByRole('button', { name: /export 3 notes/i }));
    expect(onExport).toHaveBeenCalledWith([NOTE_A, NOTE_B, NOTE_C]);
  });

  it('shows singular "Export 1 Note" when notes array has one entry', () => {
    renderModal({ notes: [NOTE_A] });
    expect(screen.getByRole('button', { name: /export 1 note$/i })).toBeInTheDocument();
  });
});

describe('ExportModal — "Select Notes" custom mode', () => {
  async function switchToCustom(user) {
    await user.click(screen.getByRole('radio', { name: /select notes to export/i }));
  }

  it('shows a list of note checkboxes when custom mode is selected', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    // All notes start selected
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('all notes are pre-selected when entering custom mode', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => expect(cb).toHaveAttribute('aria-checked', 'true'));
  });

  it('unchecking a note removes it from the count', async () => {
    const { user } = renderModal();
    await switchToCustom(user);

    await user.click(screen.getByRole('checkbox', { name: /select alpha note/i }));
    expect(
      screen.getByRole('button', { name: /export 2 notes/i })
    ).toBeInTheDocument();
  });

  it('calls onExport with only selected notes on confirm', async () => {
    const onExport = jest.fn();
    const { user } = renderModal({ onExport });
    await switchToCustom(user);

    await user.click(screen.getByRole('checkbox', { name: /select beta note/i }));

    await user.click(screen.getByRole('checkbox', { name: /select gamma note/i }));
    await user.click(screen.getByRole('button', { name: /export 1 note/i }));
    expect(onExport).toHaveBeenCalledWith([NOTE_A]);
  });

  it('disables the Export button when 0 notes are selected', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    await user.click(screen.getByRole('button', { name: /deselect all/i }));
    expect(screen.getByRole('button', { name: /export 0 notes/i })).toBeDisabled();
  });

  it('"Select All" re-selects all notes after deselecting', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    await user.click(screen.getByRole('button', { name: /deselect all/i }));
    await user.click(screen.getByRole('button', { name: /^select all$/i }));
    expect(
      screen.getByRole('button', { name: /export 3 notes/i })
    ).toBeInTheDocument();
  });

  it('filters the note list as the user types in the search box', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    await user.type(screen.getByPlaceholderText(/filter notes/i), 'Alpha');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: /select alpha note/i })).toBeInTheDocument();
  });

  it('shows "No notes match your filter" when search has no results', async () => {
    const { user } = renderModal();
    await switchToCustom(user);
    await user.type(screen.getByPlaceholderText(/filter notes/i), 'zzznomatch');
    expect(screen.getByText(/no notes match your filter/i)).toBeInTheDocument();
  });
});

describe('ExportModal — empty notes list', () => {
  it('disables the Export button when notes array is empty', () => {
    renderModal({ notes: [] });

    expect(screen.getByRole('button', { name: /export 0 notes/i })).toBeDisabled();
  });
});
