import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { ISOStandard } from '../../types/iso';

interface DocumentUploadProps {
  onUpload: (data: {
    title: string;
    type: 'manual' | 'procedure' | 'record';
    standard: ISOStandard;
    file: File;
  }) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUpload }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'manual' as const,
    standard: 'ISO9001' as ISOStandard,
    file: null as File | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.file && formData.title) {
      onUpload(formData as any);
      setIsOpen(false);
      setFormData({
        title: '',
        type: 'manual',
        standard: 'ISO9001',
        file: null,
      });
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Upload className="w-5 h-5" />
        <span>Upload Document</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload New Document</h3>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="manual">Manual</option>
                  <option value="procedure">Procedure</option>
                  <option value="record">Record</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Standard</label>
                <select
                  value={formData.standard}
                  onChange={(e) => setFormData({ ...formData, standard: e.target.value as ISOStandard })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="ISO9001">ISO 9001</option>
                  <option value="ISO14001">ISO 14001</option>
                  <option value="ISO45001">ISO 45001</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">File</label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="mt-1 block w-full"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upload
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};