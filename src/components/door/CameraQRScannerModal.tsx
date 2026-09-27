import React from 'react';
import { Member } from '../../types';
import { UniversalCameraScanner } from '../camera/UniversalCameraScanner';

export interface CameraQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberScanned: (member: Member) => void;
  currentCustomerCount: number;
  onAdmitDirectly?: (member: Member) => void;
}

export const CameraQRScannerModal: React.FC<CameraQRScannerModalProps> = ({
  isOpen,
  onClose,
  onMemberScanned,
  currentCustomerCount,
  onAdmitDirectly,
}) => {
  return (
    <UniversalCameraScanner
      mode="modal"
      isOpen={isOpen}
      onClose={onClose}
      onMemberScanned={onMemberScanned}
      currentCustomerCount={currentCustomerCount}
      onAdmitDirectly={onAdmitDirectly}
    />
  );
};
