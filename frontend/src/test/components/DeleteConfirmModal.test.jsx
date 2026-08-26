import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';



const FAKE_NOTE = { _id: 'n1', title: 'My Important Note' };

const BASE_PROPS = {
  isOpen: true,
  note: FAKE_NOTE,
  mode: 'trash',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  isDeleting: false,
};

function renderModal(overrides = {}) {
  const props = { ...BASE_PROPS, ...overrides };
  const user = userEvent.setup();
  render(<DeleteConfirmModal {...props} />);
  return { user, props };
}

// Tests


describe('DeleteConfirmModal — visibility', () => {
  it('renders nothing when isOpen is false', () => {
    render(<DeleteConfirmModal {...BASE_PROPS} isOpen={false} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the alertdialog when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('DeleteConfirmModal — trash mode (default)', () => {
  it('shows "Move to Trash?" heading', () => {
    renderModal({ mode: 'trash' });
    expect(
      screen.getByRole('heading', { name: /move to trash\?/i })
    ).toBeInTheDocument();
  });

  it('shows the note title in the description', () => {
    renderModal({ mode: 'trash' });
    expect(screen.getByText(/"My Important Note"/)).toBeInTheDocument();
  });

  it('renders "Move to Trash" as the confirm button label', () => {
    renderModal({ mode: 'trash' });
    expect(
      screen.getByRole('button', { name: /move to trash/i })
    ).toBeInTheDocument();
  });
});

describe('DeleteConfirmModal — permanent mode', () => {
  it('shows "Permanently Delete Note?" heading', () => {
    renderModal({ mode: 'permanent' });
    expect(
      screen.getByRole('heading', { name: /permanently delete note\?/i })
    ).toBeInTheDocument();
  });

  it('renders "Delete Forever" as the confirm button label', () => {
    renderModal({ mode: 'permanent' });
    expect(
      screen.getByRole('button', { name: /delete forever/i })
    ).toBeInTheDocument();
  });

  it('shows the note title in the permanent-delete description', () => {
    renderModal({ mode: 'permanent' });
    expect(screen.getByText(/"My Important Note"/)).toBeInTheDocument();
  });
});

describe('DeleteConfirmModal — empty-trash mode', () => {
  it('shows "Empty Trash?" heading', () => {
    renderModal({ mode: 'empty-trash', note: null });
    expect(
      screen.getByRole('heading', { name: /empty trash\?/i })
    ).toBeInTheDocument();
  });

  it('renders "Empty Everything" as the confirm button label', () => {
    renderModal({ mode: 'empty-trash', note: null });
    expect(
      screen.getByRole('button', { name: /empty everything/i })
    ).toBeInTheDocument();
  });

  it('shows a cannot-be-recovered warning in the description', () => {
    renderModal({ mode: 'empty-trash', note: null });
    expect(screen.getByText(/cannot be recovered/i)).toBeInTheDocument();
  });
});

describe('DeleteConfirmModal — confirm action', () => {
  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = jest.fn();
    const { user } = renderModal({ onConfirm });
    await user.click(screen.getByRole('button', { name: /move to trash/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('DeleteConfirmModal — cancel paths', () => {
  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = jest.fn();
    const { user } = renderModal({ onCancel });
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when the close (×) icon button is clicked', async () => {
    const onCancel = jest.fn();
    const { user } = renderModal({ onCancel });
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when the Escape key is pressed', async () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('does NOT call onCancel on Escape while isDeleting is true', () => {
    const onCancel = jest.fn();
    renderModal({ onCancel, isDeleting: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('DeleteConfirmModal — deleting state', () => {
  it('disables Cancel and Confirm buttons while isDeleting is true', () => {
    renderModal({ isDeleting: true });
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
  });

  it('shows "Processing..." text on the confirm button while isDeleting', () => {
    renderModal({ isDeleting: true });
    expect(
      screen.getByRole('button', { name: /processing/i })
    ).toBeInTheDocument();
  });
});
