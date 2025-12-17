/* eslint-disable */
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { RowSheet } from './RowSheet';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { FormGroup } from '@/forms/form_group';
import { FormControl } from '@/forms/form_control';

// Mock dependencies
const mocks = vi.hoisted(() => ({
    hideModal: vi.fn(),
    useReceiptState: vi.fn()
}));

vi.mock("@/components/ui/modal/ModalContext", () => ({
    useModalRef: () => ({ hideModal: mocks.hideModal })
}));

vi.mock("@/app/i18n/translations", () => ({
    t: (key: string) => key,
}));

vi.mock("@/app/receipt/components/ReceiptForm", () => ({
    useReceiptState: mocks.useReceiptState
}));

const mockUseReceiptState = mocks.useReceiptState;


describe('RowSheet Conflict Handling', () => {
    afterEach(() => cleanup());

    const setup = (propsOverrides: any = {}, receiptFormMock?: any) => {
        // Configure mockUseReceiptState
        const defaultReceiptFormMock = receiptFormMock || {
            controls: {
                positions: { controls: [] as any[] }
            },
            getRawValue: vi.fn()
        };
        mockUseReceiptState.mockReturnValue({
            scenario: { form: defaultReceiptFormMock }
        });

        const formGroup = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Item 1'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // Default initial value matches formGroup
        const initialValue = formGroup.getRawValue();

        const props = {
            formGroup,
            onFinish: vi.fn(),
            remove: vi.fn(),
            header: 'editPosition' as any,
            initialValue,
            getFormGroupCurrentState: vi.fn(),
            ...propsOverrides
        };

        const renderResult = render(<RowSheet {...props} />);

        return { props, formGroup, ...renderResult };
    };

    it('should display error when item is deleted on server', async () => {
        setup({
            getFormGroupCurrentState: () => undefined // Deleted
        });

        await waitFor(() => {
            expect(screen.queryByText(/Error/i)).toBeTruthy();
            expect(screen.queryByText(/deleted by another user/i)).toBeTruthy();
        });
    });

    it('should auto-update form if local state is pristine and server updates', async () => {
        // 1. Setup with matching initialValue and local form (Pristine)
        const formGroup = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Item 1'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });
        const patchValueSpy = vi.spyOn(formGroup, 'patchValue');
        const initialValue = formGroup.getRawValue();

        const serverValue = { ...initialValue, name: 'Server Update' };
        const serverControl = new FormGroup({
            id: new FormControl(serverValue.id),
            name: new FormControl(serverValue.name),
            price: new FormControl(serverValue.price),
            quantity: new FormControl(serverValue.quantity)
        });

        render(<RowSheet
            formGroup={formGroup}
            onFinish={vi.fn()}
            header={'editPosition' as any}
            initialValue={initialValue}
            getFormGroupCurrentState={() => serverControl}
        />);

        await waitFor(() => {
            // Should have called patchValue with server data
            expect(patchValueSpy).toHaveBeenCalledWith(serverValue);
            // Should NOT show modified warning
            expect(screen.queryByText(/modified by another user/i)).toBeNull();
        });
    });

    it('should update UI inputs when form auto-updates (pristine)', async () => {
        // 1. Setup with matching initialValue and local form (Pristine)
        const formGroup = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Item 1'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });
        const initialValue = formGroup.getRawValue();

        // Server update
        const serverValue = { ...initialValue, name: 'Server Update' };
        const serverControl = new FormGroup({
            id: new FormControl(serverValue.id),
            name: new FormControl(serverValue.name),
            price: new FormControl(serverValue.price),
            quantity: new FormControl(serverValue.quantity)
        });

        render(<RowSheet
            formGroup={formGroup}
            onFinish={vi.fn()}
            header={'editPosition' as any}
            initialValue={initialValue}
            getFormGroupCurrentState={() => serverControl}
        />);

        // Logic check
        expect(formGroup.controls.name.value).toBe('Server Update');

        // UI Check with robust selector
        // Bypassing association issues by finding generic textboxes and filtering by value
        const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
        const updatedInput = inputs.find(input => input.value === 'Server Update');
        expect(updatedInput).toBeTruthy();
    });

    it('should show conflict resolution options when local is dirty', async () => {
        const formGroup = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'), // User changed this
            price: new FormControl(10),
            quantity: new FormControl(1)
        });
        const patchValueSpy = vi.spyOn(formGroup, 'patchValue');
        // Initial value was different
        const initialValue = { ...formGroup.getRawValue(), name: 'Item 1' };

        const serverValue = { ...initialValue, name: 'Server Update' };
        const serverControl = new FormGroup({
            id: new FormControl(serverValue.id),
            name: new FormControl(serverValue.name),
            price: new FormControl(serverValue.price),
            quantity: new FormControl(serverValue.quantity)
        });

        render(<RowSheet
            formGroup={formGroup}
            onFinish={vi.fn()}
            header={'editPosition' as any}
            initialValue={initialValue}
            getFormGroupCurrentState={() => serverControl}
        />);

        await waitFor(() => {
            // Check for conflict resolution UI
            expect(screen.getByText(/The server has a different version/i)).toBeTruthy();
            expect(screen.getByText('Accept Server Update')).toBeTruthy();
            expect(screen.getByText('Keep My Version')).toBeTruthy();

            // Should NOT auto-update
            expect(patchValueSpy).not.toHaveBeenCalled();
            // Local value should remain user's edit
            expect(formGroup.controls.name.value).toBe('User Edit');
        });
    });

    it('should update form and clear conflict when accepting server update', async () => {
        const localForm = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });
        const initialValue = { id: '123', name: 'Item 1', price: 10, quantity: 1 };
        const serverControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Server Update'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        const updateSpy = vi.spyOn(localForm, 'patchValue');

        setup({
            formGroup: localForm,
            initialValue: initialValue,
            getFormGroupCurrentState: () => serverControl
        });

        // Wait for buttons
        const acceptButton = await screen.findByText('Accept Server Update');

        // Click Accept
        acceptButton.click();

        // Verify update happened
        expect(updateSpy).toHaveBeenCalledWith({
            id: '123',
            name: 'Server Update',
            price: 10,
            quantity: 1
        });
        expect(localForm.controls.name.value).toBe('Server Update');

        // Verify conflict UI gone
        await waitFor(() => {
            expect(screen.queryByText(/The server has a different version/i)).toBeNull();
        });
    });

    it('should clear conflict when keeping local version', async () => {
        const localForm = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });
        const initialValue = { id: '123', name: 'Item 1', price: 10, quantity: 1 };
        const serverControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Server Update'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        const updateSpy = vi.spyOn(localForm, 'patchValue');

        setup({
            formGroup: localForm,
            initialValue: initialValue,
            getFormGroupCurrentState: () => serverControl
        });

        // Wait for buttons
        const keepButton = await screen.findByText('Keep My Version');

        // Click Keep
        keepButton.click();

        // Verify NO update
        expect(updateSpy).not.toHaveBeenCalled();
        expect(localForm.controls.name.value).toBe('User Edit');

        // Verify conflict UI gone
        await waitFor(() => {
            expect(screen.queryByText(/The server has a different version/i)).toBeNull();
        });
    });

    it('should clear warning if server reverts to initial state', async () => {
        // 1. Setup dirty local state
        const localForm = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'), // Initial was 'Item 1'
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // 2. Define Initial State
        const initialValue = { id: '123', name: 'Item 1', price: 10, quantity: 1 };

        // 3. Define Server State = Conflict ('Server Update')
        const conflictServerControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Server Update'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // 4. Define Server State = Revert ('Item 1' - matches initial)
        const revertedServerControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Item 1'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // Mock getFormGroupCurrentState to return conflict
        const getFormGroupCurrentState = vi.fn().mockReturnValue(conflictServerControl);

        // Start with conflict
        const { rerender } = setup(
            { formGroup: localForm, initialValue, getFormGroupCurrentState },
            { controls: {}, getRawValue: () => conflictServerControl.getRawValue() } // Mock Form State
        );

        getFormGroupCurrentState.mockReturnValue(conflictServerControl);

        // Wait for effect
        await waitFor(() => {
            expect(screen.getByText(/modified/i)).toBeTruthy();
        });

        // 5. Update Server State to Reverted
        // We need to trigger a re-render with new form state context

        // Re-configure mock to return new state
        mockUseReceiptState.mockReturnValue({
            scenario: { form: { controls: {}, getRawValue: () => revertedServerControl.getRawValue() } }
        });
        getFormGroupCurrentState.mockReturnValue(revertedServerControl);

        // Rerender component (trigger effect)
        rerender(
            <RowSheet
                header="editPosition"
                formGroup={localForm}
                initialValue={initialValue}
                onFinish={vi.fn()}
                remove={vi.fn()}
                getFormGroupCurrentState={getFormGroupCurrentState}
            />
        );

        await waitFor(() => {
            expect(screen.queryByText(/Modified/i)).toBeNull();
        });
    });

    it('should clear warning if server updates to match local user state', async () => {
        // 1. Setup dirty local state
        const localForm = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // 2. Define Initial State
        const initialValue = { id: '123', name: 'Item 1', price: 10, quantity: 1 };

        // 3. Define Server State = Conflict ('Server Update')
        const conflictServerControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('Server Update'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        // 4. Define Server State = Match User ('User Edit')
        const matchingServerControl = new FormGroup({
            id: new FormControl('123'),
            name: new FormControl('User Edit'),
            price: new FormControl(10),
            quantity: new FormControl(1)
        });

        const getFormGroupCurrentState = vi.fn().mockReturnValue(conflictServerControl);

        // Start with conflict
        const { rerender } = setup(
            { formGroup: localForm, initialValue, getFormGroupCurrentState },
            { controls: {}, getRawValue: () => conflictServerControl.getRawValue() }
        );

        await waitFor(() => {
            expect(screen.getByText(/Modified/i)).toBeTruthy();
        });

        // 5. Update Server to Match User
        mockUseReceiptState.mockReturnValue({
            scenario: { form: { controls: {}, getRawValue: () => matchingServerControl.getRawValue() } }
        });
        getFormGroupCurrentState.mockReturnValue(matchingServerControl);

        rerender(
            <RowSheet
                header="editPosition"
                formGroup={localForm}
                initialValue={initialValue}
                onFinish={vi.fn()}
                remove={vi.fn()}
                getFormGroupCurrentState={getFormGroupCurrentState}
            />
        );

        await waitFor(() => {
            expect(screen.queryByText(/Modified/i)).toBeNull();
        });
    });
});
