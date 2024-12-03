import React, { useState } from 'react';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { useISOStore } from '../store/useISOStore';
import type { Document, ISOStandard } from '../types/iso';

export const Documents: React.FC = () => {
  const documents = useISOStore((state) => state.documents);
  const addDocument = useISOStore((state) => state.addDocument);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'manual' | 'procedure' | 'record' | 'all'>('all');

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStandard = standardFilter === 'all' || doc.standard === standardFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStandard && matchesType;
  });

  const handleUpload = async (data: {
    title: string;
    type: 'manual' | 'procedure' | 'record';
    standard: ISOStandard;
    file: File;
  }) => {
    // In a real application, you would upload the file to a server here
    const newDocument: Document = {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title,
      type: data.type,
      standard: data.standard,
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      url: URL.createObjectURL(data.file), // Temporary URL for demo
    };
    addDocument(newDocument);
  };

  const handleViewDocument = (doc: Document) => {
    window.open(doc.url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <DocumentUpload onUpload={handleUpload} />
      </div>

      <DocumentFilters
        onSearch={setSearchQuery}
        onFilterStandard={setStandardFilter}
        onFilterType={setTypeFilter}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onView={handleViewDocument}
          />
        ))}
        
        {filteredDocuments.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No documents found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};