import React, { useState } from 'react';
import { FileUp, Sparkles, Upload, X } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { DocumentFormat, ISOStandard } from '../../types/iso';

interface DocumentUploadProps {
  disabled?: boolean;
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

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUpload, disabled = false }) => {
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

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const resetForm = React.useCallback(() => {
    setFormData({
      title: '',
      topic: '',
      type: 'manual',
      format: 'PDF',
      standard: standardOptions[0]?.code ?? 'ISO9001',
      version: '1.0',
      file: null,
    });
  }, [standardOptions]);

  const closeModal = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
      closeModal();
      resetForm();
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="app-button-primary inline-flex items-center gap-2 px-5 py-3 text-sm"
      >
        <Upload className="h-5 w-5" />
        <span>Subir documento</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-3xl sm:rounded-[32px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                    Control documental
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold">Subir nuevo documento</h3>
                  <p className="mt-2 text-sm text-white/75">
                    Registra archivos controlados con metadatos, versión y norma asociada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80">
                <Sparkles className="h-4 w-4 text-app-warning" />
                Carga controlada para manuales, procedimientos y registros.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="text-sm font-bold text-slate-600">Título</span>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(event) =>
                            setFormData({ ...formData, title: event.target.value })
                          }
                          className="admin-input mt-2"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Tema</span>
                        <input
                          type="text"
                          value={formData.topic}
                          onChange={(event) =>
                            setFormData({ ...formData, topic: event.target.value })
                          }
                          className="admin-input mt-2"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Versión inicial</span>
                        <input
                          type="text"
                          value={formData.version}
                          onChange={(event) =>
                            setFormData({ ...formData, version: event.target.value })
                          }
                          className="admin-input mt-2"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Tipo</span>
                        <select
                          value={formData.type}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              type: event.target.value as 'manual' | 'procedure' | 'record',
                            })
                          }
                          className="admin-select mt-2 w-full"
                        >
                          <option value="manual">Manual</option>
                          <option value="procedure">Procedimiento</option>
                          <option value="record">Registro</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Norma</span>
                        <select
                          value={formData.standard}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              standard: event.target.value as ISOStandard,
                            })
                          }
                          className="admin-select mt-2 w-full"
                        >
                          {standardOptions.map((standard) => (
                            <option key={standard.id} value={standard.code}>
                              {standard.code} · {standard.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-sm font-bold text-slate-600">Formato</span>
                        <select
                          value={formData.format}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              format: event.target.value as DocumentFormat,
                            })
                          }
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
                      </label>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Archivo
                      </p>
                      <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white/80 p-5">
                        <div className="flex items-start gap-4">
                          <div className="app-icon-chip">
                            <FileUp className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-700">
                              {formData.file?.name ?? 'Selecciona el archivo a registrar'}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Soporta PDF, Office, texto e imágenes para vista o descarga local.
                            </p>
                          </div>
                        </div>

                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif,image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setFormData({
                              ...formData,
                              file,
                              format: file ? detectFormat(file.name) : formData.format,
                            });
                          }}
                          className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-app-primary/10 file:px-4 file:py-2 file:font-bold file:text-app-primary hover:file:bg-app-primary/15"
                          required
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Vista rápida
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-2xl bg-white/85 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            Norma
                          </p>
                          <p className="mt-2 text-sm font-bold text-app-text">
                            {formData.standard}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/85 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            Tipo
                          </p>
                          <p className="mt-2 text-sm font-bold text-app-text">
                            {formData.type}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/85 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            Formato
                          </p>
                          <p className="mt-2 text-sm font-bold text-app-text">
                            {formData.format}
                          </p>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="border-t border-app-border bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="app-button-secondary w-full sm:w-auto sm:min-w-[160px]"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="app-button-primary w-full sm:flex-1">
                    Guardar documento
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};
