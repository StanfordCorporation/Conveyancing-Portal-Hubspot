import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter
} from '../ui/Dialog';

/**
 * Duplicate Agent Confirmation Modal
 * Shows when an agent with matching email/phone already exists
 * Allows user to:
 * 1. Use the existing agent
 * 2. Create a new agent with different details
 */
export function DuplicateAgentModal({
  isOpen,
  onOpenChange,
  existingAgent,
  onUseExisting,
  onCreateNew
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <DialogTitle>Agent Already Exists</DialogTitle>
            <DialogDescription>
              We found a matching agent in the system
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <p className="text-slate-700">
            An agent with this email or phone number already exists:
          </p>

          {/* Existing Agent Details */}
          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-2">
            <p className="font-semibold text-blue-900">
              {existingAgent?.firstname} {existingAgent?.lastname}
            </p>
            {existingAgent?.email && (
              <p className="text-sm text-blue-800">
                📧 {existingAgent.email}
              </p>
            )}
            {existingAgent?.phone && (
              <p className="text-sm text-blue-800">
                📱 {existingAgent.phone}
              </p>
            )}
          </div>

          <p className="text-slate-600 text-sm">
            Do you want to use this existing agent for the new agency?
          </p>
        </div>
      </DialogContent>

      <DialogFooter>
        <button
          onClick={onCreateNew}
          className="px-6 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Create New Agent
        </button>
        <button
          onClick={onUseExisting}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Use Existing Agent
        </button>
      </DialogFooter>
    </Dialog>
  );
}

export default DuplicateAgentModal;
