'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Image,
  Download,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  FileIcon,
  Calendar,
  User,
  HardDrive,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface MedicalDocument {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  holidayRequestId: string;
}

interface StorageUsage {
  totalFiles: number;
  totalSizeBytes: number;
  usagePercentage: number;
  remainingBytes: number;
  freeLimit: number;
  isNearLimit: boolean;
  isCritical: boolean;
  isFull: boolean;
  formatted: {
    totalSize: string;
    remainingSpace: string;
    freeLimit: string;
  };
}

type SortField = 'uploadedAt' | 'uploadedBy' | 'fileName' | 'fileSize';
type SortOrder = 'asc' | 'desc';

export function DocumentManagement() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isDeleting, setIsDeleting] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Load documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/get-medical-documents?sortBy=${sortField}&sortOrder=${sortOrder}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to load documents`);
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Load storage usage
  const fetchStorageUsage = async () => {
    try {
      setStorageLoading(true);

      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/get-storage-usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to load storage usage:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success && data.storage) {
        setStorageUsage(data.storage);
      }
    } catch (err) {
      console.warn('Error fetching storage usage:', err);
      // Non-critical error, don't show to user
    } finally {
      setStorageLoading(false);
    }
  };

  // Download document
  const handleDownload = async (doc: MedicalDocument) => {
    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/download-medical-certificate?fileId=${encodeURIComponent(doc.fileName)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  // Delete documents
  const handleDelete = async (documentIds: string[]) => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/delete-medical-documents`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds })
      });

      if (!response.ok) {
        throw new Error('Failed to delete documents');
      }

      // Refresh documents list
      await fetchDocuments();
      setSelectedDocuments(new Set());
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete documents');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  // Handle individual selection
  const handleSelect = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  // Load documents on component mount
  useEffect(() => {
    fetchDocuments();
    fetchStorageUsage();
  }, [sortField, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('admin.documents.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('admin.documents.description')}
              </p>
            </div>

            {/* Storage Usage Summary */}
            <div className="flex items-center gap-4 text-sm">
              {storageUsage && (
                <>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span>
                      {storageUsage.totalFiles} {t('admin.documents.totalDocuments')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {storageUsage.isCritical && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {storageUsage.isNearLimit && !storageUsage.isCritical && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    <span className={`${
                      storageUsage.isCritical ? 'text-red-600 font-semibold' :
                      storageUsage.isNearLimit ? 'text-yellow-600 font-semibold' :
                      'text-muted-foreground'
                    }`}>
                      {storageUsage.formatted.totalSize} / {storageUsage.formatted.freeLimit}
                      <span className="ml-1">({storageUsage.usagePercentage}%)</span>
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchStorageUsage}
                    disabled={storageLoading}
                    className="h-8 w-8 p-0"
                    title="Aggiorna"
                  >
                    <RefreshCw className={`h-4 w-4 ${storageLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              )}

              {storageLoading && !storageUsage && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">{t('admin.documents.storage.loadingInfo')}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Storage Warnings */}
      {storageUsage?.isCritical && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('admin.documents.storage.critical')}:</strong> {t('admin.documents.storage.criticalMessage', {
              percentage: storageUsage.usagePercentage.toString()
            })}
          </AlertDescription>
        </Alert>
      )}

      {storageUsage?.isNearLimit && !storageUsage?.isCritical && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('admin.documents.storage.warning')}:</strong> {t('admin.documents.storage.warningMessage', {
              percentage: storageUsage.usagePercentage.toString(),
              remaining: storageUsage.formatted.remainingSpace
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              {t('common.dismiss')}
            </button>
          </AlertDescription>
        </Alert>
      )}


      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t('admin.documents.noDocuments')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedDocuments.size === documents.length && documents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left">{t('admin.documents.table.type')}</th>
                    <th className="p-4 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('fileName')}
                      >
                        {t('admin.documents.table.fileName')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-4 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('fileSize')}
                      >
                        {t('admin.documents.table.size')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-4 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('uploadedAt')}
                      >
                        {t('admin.documents.table.uploadDate')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-4 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('uploadedBy')}
                      >
                        {t('admin.documents.table.uploadedBy')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-4 text-right">{t('admin.documents.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onCheckedChange={() => handleSelect(document.id)}
                        />
                      </td>
                      <td className="p-4">
                        {getFileIcon(document.mimeType)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{document.originalFileName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(document.fileSize)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(document.uploadedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{document.uploadedBy.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {document.uploadedBy.email}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete([document.id])}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}