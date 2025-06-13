import React from 'react';
import { FormGroup } from '@/forms/form_group';

interface RowModalProps {
  row: FormGroup;
}

export const RowModal: React.FC<RowModalProps> = ({ row }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Popup Works</h2>
      <p className="text-center text-gray-600">
        This modal will be enhanced in future updates to display and edit row details.
      </p>
      <p className="text-center text-gray-600">
        This modal will be enhanced in future updates to display and edit row details.
      </p>
      <p className="text-center text-gray-600">
        This modal will be enhanced in future updates to display and edit row details.
      </p>
      <p className="text-center text-gray-600">
        This modal will be enhanced in future updates to display and edit row details.
      </p>
    </div>
  );
};
