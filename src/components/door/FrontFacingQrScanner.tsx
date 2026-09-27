import React from 'react';
import { Member } from '../../types';
import { UniversalCameraScanner } from '../camera/UniversalCameraScanner';

export interface FrontFacingQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberScanned: (member: Member) => void;
  currentCustomerCount?: number;
  onAdmitDirectly?: (member: Member) => void;
}

export const FrontFacingQrScanner: React.FC<FrontFacingQrScannerProps> = ({
  isOpen,
  onClose,
  onMemberScanned,
  currentCustomerCount = 0,
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
