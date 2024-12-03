import React from 'react';
import { FileText, Clock, Tag } from 'lucide-react';
import type { Document } from '../../types/iso';

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onView }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="font-medium text-gray-900">{document.title}</h3>
            <p className="text-sm text-gray-500">{document.type}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          document.status === 'active' ? 'bg-green-100 text-green-800' :
          document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {document.status}
        </span>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>v{document.version}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4" />
          <span>{document.standard}</span>
        </div>
      </div>
      
      <button
        onClick={() => onView(document)}
        className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
      >
        View Document
      </button>
    </div>
  );
};