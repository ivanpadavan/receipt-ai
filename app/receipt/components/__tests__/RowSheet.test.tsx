import { render, screen, waitFor } from '@testing-library/react';
import { RowSheet } from '../RowSheet';
import { vi, describe, it, expect } from 'vitest';
import { FormGroup } from '@/forms/form_group';
import { FormControl } from '@/forms/form_control';

// Mock dependencies
const mockHideModal = vi.fn();
vi.mock("@/components/ui/modal/ModalContext", () => ({
    useModal: () => ({ hideModal: mockHideModal })
}));

vi.mock("@/app/i18n/translations", () => ({
    t: (key: string) => key,
}));

// Mock useReceiptState 
const mockGlobalForm = {
    controls: {
        positions: { controls: [] as any[] }
    },
    getRawValue: vi.fn()
};

vi.mock("@/app/receipt/components/ReceiptForm", () => ({
    useReceiptState: () => ({
        scenario: { form: mockGlobalForm }
    })
}));

vi.mock("@/hooks/rx/useObservable", () => ({
    useObservable: vi.fn()
}));

describe('RowSheet Conflict Handling', () => {
    const setup = (propsOverrides: any = {}) => {
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
            getFormGroupCurrentState: vi.fn(), // Default mock
            ...propsOverrides
        };

        return { props, formGroup, renderResult: render(<RowSheet {...props} />) };
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

    it('should show warning and not auto-update when local is dirty', async () => {
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
            // Should NOT auto-update
            expect(patchValueSpy).not.toHaveBeenCalled();
            // Should show modified warning
            expect(screen.queryByText(/modified by another user/i)).toBeTruthy();
        });
    });
});
