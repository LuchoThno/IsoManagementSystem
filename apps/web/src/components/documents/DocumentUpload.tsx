import React, { useState } from 'react';
import { FileUp, Sparkles, Upload, X } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { DocumentFormat, ISOStandard } from '../../types/iso';

interface DocumentUploadProps {
  onUpload: (data: {
    title: string;
    topic: string;
    type: 'manual' | 'procedure' | 'record';
    format: DocumentFormat;
    standard: ISOStandard;
    version: string;
    file: File;
  }) => void;
}

const detectFormat = (fileName: string): DocumentFormat => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'png':
      return 'PNG';
    case 'jpg':
    case 'jpeg':
      return 'JPG';
    case 'webp':
      return 'WEBP';
    case 'gif':
      return 'GIF';
    case 'doc':
    case 'docx':
      return 'DOCX';
    case 'xls':
    case 'xlsx':
      return 'XLSX';
    case 'ppt':
    case 'pptx':
      return 'PPTX';
    default:
      return 'TXT';
  }
};

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUpload }) => {
  const standardOptions = useStandardOptions();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    type: 'manual' as const,
    format: 'PDF' as DocumentFormat,
    standard: standardOptions[0]?.code ?? ('ISO9001' as ISOStandard),
    version: '1.0',
    file: null as File | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.file && formData.title) {
      onUpload({
        title: formData.title,
        topic: formData.topic,
        type: formData.type,
        format: formData.format,
        standard: formData.standard,
        version: formData.version,
        file: formData.file,
      });
      setIsOpen(false);
      setFormData({
        title: '',
        topic: '',
        type: 'manual',
        format: 'PDF',
        standard: standardOptions[0]?.code ?? 'ISO9001',
        version: '1.0',
        file: null,
      });
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="app-button-primary inline-flex items-center gap-2 px-5 py-3 text-sm"
      >
        <Upload className="w-5 h-5" />
        <span>Subir documento</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-app-surface shadow-floating">
            <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                    Control documental
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold">Subir nuevo documento</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="rounded-xl bg-white/10 p-2 transition hover:bg-white/15">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80">
                <Sparkles className="h-4 w-4 text-app-warning" />
                Carga controlada para manuales, procedimientos y registros.
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600">Titulo</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600">Tema</label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600">Version inicial</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'manual' | 'procedure' | 'record' })}
                      className="admin-select mt-2 w-full"
                    >
                      <option value="manual">Manual</option>
                      <option value="procedure">Procedimiento</option>
                      <option value="record">Registro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600">Norma</label>
                    <select
                      value={formData.standard}
                      onChange={(e) => setFormData({ ...formData, standard: e.target.value as ISOStandard })}
                      className="admin-select mt-2 w-full"
                    >
                      {standardOptions.map((standard) => (
                        <option key={standard.id} value={standard.code}>
                          {standard.code} · {standard.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600">Formato</label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as DocumentFormat })}
                      className="admin-select mt-2 w-full"
                    >
                      <option value="PDF">PDF</option>
                      <option value="DOCX">DOCX</option>
                      <option value="XLSX">XLSX</option>
                      <option value="PPTX">PPTX</option>
                      <option value="TXT">TXT</option>
                      <option value="PNG">PNG</option>
                      <option value="JPG">JPG</option>
                      <option value="WEBP">WEBP</option>
                      <option value="GIF">GIF</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-app-surface-alt p-4">
                  <label className="block text-sm font-bold text-slate-600">Archivo</label>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-app-surface px-4 py-4">
                    <div className="app-icon-chip">
                      <FileUp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">
                        {formData.file?.name ?? 'Selecciona el archivo a registrar'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Soporta PDF, Office, texto e imagenes para vista o descarga local.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFormData({
                          ...formData,
                          file,
                          format: file ? detectFormat(file.name) : formData.format,
                        });
                      }}
                      className="block w-full max-w-[220px] text-sm text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="app-button-secondary w-full"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="app-button-primary w-full"
                  >
                    Subir documento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
