import { ModalContext } from "@/components/ui/modal/ModalContext";
import { FormControl } from "@/forms/form_control";
import { ValidationErrors } from "@/forms/validators";
import { useObservable } from "@ngneat/react-rxjs";
import React, { useContext, useMemo } from "react";
import { FormGroup } from '@/forms/form_group';
import { t, TranslationKey } from "@/app/i18n/translations";

interface RowModalProps {
  row: FormGroup<Record<TranslationKey, FormControl<string | number>>>;
}

export const RowModal: React.FC<RowModalProps> = ({ row }) => {
  useObservable(row.valueChanges);
  const hideModal = useContext(ModalContext)?.hideModal;
  const controls = useMemo(() => Object.entries(row.controls), [row]) as [TranslationKey, FormControl<string | number>][];
  const errors = row.valid ? [] : controls
    .filter(([, errors]) => errors !== null)
    .map(([label, { errors }]) => [label as TranslationKey, Object.values(errors as ValidationErrors)]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">{t('editRow')}</h2>

      <div className="space-y-4">
        {controls.map(([label, control], idx) => (
          <FormField
            key={idx}
            label={label}
            control={control}
          />
        ))}

        <div className="flex justify-end space-x-2 mt-6">
          {hideModal && <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            onClick={() => hideModal()}
          >
            {t('cancel')}
          </button>}
          <button
            type="button"
            onClick={() => row.updateValueAndValidity()}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Component for rendering a single form field
const FormField: React.FC<{ control: FormControl<string | number>, label: TranslationKey }> = ({ control, label }) => {
  const type = typeof control.getRawValue();
  const isInvalid = control.invalid;
  const errors = control.errors ? Object.values(control.errors) : [];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t(label)}
      </label>
      <input
        type={type}
        value={control.value}
        onChange={(event) => control.patchValue(type === 'number' ? +event.target.value : event.target.value)}
        disabled={control.disabled}
        className={`w-full px-3 py-2 border rounded-md ${
          isInvalid
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'
        } ${control.disabled ? 'bg-gray-100' : ''}`}
      />
    </div>
  );
};
