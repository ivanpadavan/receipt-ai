import { AppendableForm } from "@/app/receipt/[id]/receipt-state";
import { ModalContext } from "@/components/ui/modal/ModalContext";
import { FormControl } from "@/forms/form_control";
import { ValidationErrors } from "@/forms/validators";
import { useObservable } from "@ngneat/react-rxjs";
import React, { useContext, useMemo } from "react";
import { t, TranslationKey } from "@/app/i18n/translations";

interface RowModalProps {
  formGroup: AppendableForm;
  onFinish: () => void;
  remove?: () => void;
  header?: TranslationKey;
}

export const RowModal: React.FC<RowModalProps> = ({ formGroup, onFinish, remove, header = 'editRow' }) => {
  useObservable(formGroup.valueChanges as any);
  const hideModal = useContext(ModalContext)?.hideModal;
  if (!hideModal) {
    throw new Error('ModalContext not found');
  }
  const controls = useMemo(() => Object.entries(formGroup.controls), [formGroup]) as [TranslationKey, FormControl<string | number>][];
  const errors = controls
    .filter(([, { errors }]) => errors !== null)
    .map(([label, { errors }]) => [label, Object.values(errors as ValidationErrors)] as const);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">{t(header)}</h2>
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <ul className="list-disc pl-5 space-y-1">
            {errors.map(([label, fieldErrors], index) => (
              <li key={index} className="text-sm text-red-700">
                <strong>{t(label)}:</strong> {fieldErrors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {controls.map(([label, control], idx) => (
          <FormField
            key={idx}
            label={label}
            control={control}
          />
        ))}

        <div className="flex justify-between mt-6">
          <div>
            {remove && (
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={() => { remove(); hideModal(); }}
              >
                {t('remove')}
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            {hideModal && <button
              type="button"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              onClick={() => hideModal()}
            >
              {t('cancel')}
            </button>}
            <button
              type="button"
              disabled={formGroup.invalid}
              onClick={() => { onFinish(); hideModal(); }}
              className={`px-4 py-2 bg-amber-500 text-white rounded transition-colors ${
                formGroup.invalid 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-amber-600'
              }`}
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for rendering a single form field
const FormField: React.FC<{ control: FormControl<string | number>, label: TranslationKey }> = ({ control, label }) => {
  const type = typeof control.getRawValue();
  const isInvalid = control.invalid;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t(label)}
      </label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        defaultValue={control.disabled ? undefined : type === 'number' && control.value === 0 ? '' : control.value}
        value={control.disabled ? control.value : undefined}
        onChange={(event) => control.patchValue(type === 'number' ? event.target.valueAsNumber : event.target.value)}
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
