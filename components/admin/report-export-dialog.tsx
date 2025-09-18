'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  Table,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Calendar,
  Users,
  Building2,
  Clock
} from 'lucide-react';
import { ExportOptions, PDFExportOptions, ExcelExportOptions, ReportPeriod } from '@/lib/export/types';

interface ReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  period: ReportPeriod;
  loading?: boolean;
  error?: string | null;
}

export function ReportExportDialog({
  isOpen,
  onClose,
  onExport,
  period,
  loading = false,
  error = null
}: ReportExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'pdf' | 'excel' | 'both'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeEmployeeDetails, setIncludeEmployeeDetails] = useState(true);
  const [includeDepartmentAnalysis, setIncludeDepartmentAnalysis] = useState(true);
  const [includeRequestHistory, setIncludeRequestHistory] = useState(true);

  // PDF specific options
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'a3' | 'letter'>('a4');
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Excel specific options
  const [includeFormulas, setIncludeFormulas] = useState(true);
  const [includePivotTables, setIncludePivotTables] = useState(false);
  const [includeConditionalFormatting, setIncludeConditionalFormatting] = useState(true);
  const [separateSheets, setSeparateSheets] = useState(true);

  const [exportStep, setExportStep] = useState<'options' | 'exporting' | 'completed'>('options');
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setExportStep('exporting');
    setExportProgress(0);

    const baseOptions: ExportOptions = {
      format,
      includeCharts,
      includeEmployeeDetails,
      includeDepartmentAnalysis,
      includeRequestHistory,
      period
    };

    const exportOptions: ExportOptions = {
      ...baseOptions,
      // PDF specific options (only used if PDF export)
      ...(format === 'pdf' || format === 'both' ? {
        orientation: pdfOrientation,
        pageSize: pdfPageSize,
        includeCoverPage,
        includeSignature
      } as PDFExportOptions : {}),
      // Excel specific options (only used if Excel export)
      ...(format === 'excel' || format === 'both' ? {
        includeFormulas,
        includePivotTables,
        includeConditionalFormatting,
        separateSheets
      } as ExcelExportOptions : {})
    };

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onExport(exportOptions);

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStep('completed');

      // Close dialog after 2 seconds
      setTimeout(() => {
        onClose();
        setExportStep('options');
        setExportProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStep('options');
      setExportProgress(0);
    }
  };

  const resetDialog = () => {
    setExportStep('options');
    setExportProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>{t('admin.reports.export.title')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('admin.reports.export.description')} - {period.label}
          </DialogDescription>
        </DialogHeader>

        {exportStep === 'options' && (
          <div className="space-y-6">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>{t('admin.reports.export.format')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-red-600" />
                      <span>{t('admin.reports.export.formatOptions.pdf')}</span>
                      <Badge variant="secondary">{t('admin.reports.export.formatOptions.charts')}</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excel" id="excel" />
                    <Label htmlFor="excel" className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>{t('admin.reports.export.formatOptions.excel')}</span>
                      <Badge variant="secondary">{t('admin.reports.export.formatOptions.formulas')}</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-blue-600" />
                      <span>{t('admin.reports.export.formatOptions.both')}</span>
                      <Badge variant="outline">{t('admin.reports.export.formatOptions.recommended')}</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Content Options */}
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.reports.export.content')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="charts"
                      checked={includeCharts}
                      onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                    />
                    <Label htmlFor="charts" className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('admin.reports.export.contentOptions.charts')}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="employees"
                      checked={includeEmployeeDetails}
                      onCheckedChange={(checked) => setIncludeEmployeeDetails(checked === true)}
                    />
                    <Label htmlFor="employees" className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{t('admin.reports.export.contentOptions.employeeDetails')}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="departments"
                      checked={includeDepartmentAnalysis}
                      onCheckedChange={(checked) => setIncludeDepartmentAnalysis(checked === true)}
                    />
                    <Label htmlFor="departments" className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>{t('admin.reports.export.contentOptions.departmentAnalysis')}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requests"
                      checked={includeRequestHistory}
                      onCheckedChange={(checked) => setIncludeRequestHistory(checked === true)}
                    />
                    <Label htmlFor="requests" className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{t('admin.reports.export.contentOptions.requestHistory')}</span>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PDF Options */}
            {(format === 'pdf' || format === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span>{t('admin.reports.export.pdfOptions.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('admin.reports.export.pdfOptions.orientation')}</Label>
                      <RadioGroup value={pdfOrientation} onValueChange={(value: any) => setPdfOrientation(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="portrait" id="portrait" />
                          <Label htmlFor="portrait">{t('admin.reports.export.pdfOptions.orientationVertical')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="landscape" id="landscape" />
                          <Label htmlFor="landscape">{t('admin.reports.export.pdfOptions.orientationHorizontal')}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('admin.reports.export.pdfOptions.pageFormat')}</Label>
                      <RadioGroup value={pdfPageSize} onValueChange={(value: any) => setPdfPageSize(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="a4" id="a4" />
                          <Label htmlFor="a4">A4</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="a3" id="a3" />
                          <Label htmlFor="a3">A3</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="letter" id="letter" />
                          <Label htmlFor="letter">Letter</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coverpage"
                        checked={includeCoverPage}
                        onCheckedChange={(checked) => setIncludeCoverPage(checked === true)}
                      />
                      <Label htmlFor="coverpage">{t('admin.reports.export.pdfOptions.coverPage')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="signature"
                        checked={includeSignature}
                        onCheckedChange={(checked) => setIncludeSignature(checked === true)}
                      />
                      <Label htmlFor="signature">{t('admin.reports.export.pdfOptions.signature')}</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Excel Options */}
            {(format === 'excel' || format === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>{t('admin.reports.export.excelOptions.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="formulas"
                        checked={includeFormulas}
                        onCheckedChange={(checked) => setIncludeFormulas(checked === true)}
                      />
                      <Label htmlFor="formulas">{t('admin.reports.export.excelOptions.formulas')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pivottables"
                        checked={includePivotTables}
                        onCheckedChange={(checked) => setIncludePivotTables(checked === true)}
                      />
                      <Label htmlFor="pivottables">{t('admin.reports.export.excelOptions.pivotTables')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="formatting"
                        checked={includeConditionalFormatting}
                        onCheckedChange={(checked) => setIncludeConditionalFormatting(checked === true)}
                      />
                      <Label htmlFor="formatting">{t('admin.reports.export.excelOptions.conditionalFormatting')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sheets"
                        checked={separateSheets}
                        onCheckedChange={(checked) => setSeparateSheets(checked === true)}
                      />
                      <Label htmlFor="sheets">{t('admin.reports.export.excelOptions.separateSheets')}</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {exportStep === 'exporting' && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">{t('admin.reports.export.progress.generating')}</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
            <p className="text-sm text-gray-600">
              {t('admin.reports.export.progress.creating')} {format === 'both' ? t('admin.reports.export.progress.bothFormats') : format.toUpperCase()} - {period.label}
            </p>
          </div>
        )}

        {exportStep === 'completed' && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-lg font-medium text-green-600">{t('admin.reports.export.success.title')}</span>
            </div>
            <p className="text-sm text-gray-600">
              {t('admin.reports.export.success.description')}
            </p>
          </div>
        )}

        {exportStep === 'options' && (
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleExport} disabled={loading} className="flex items-center space-x-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>
                {loading ? t('admin.reports.export.generating') : `${t('admin.reports.export.actions.export')} ${format === 'both' ? 'PDF + Excel' : format.toUpperCase()}`}
              </span>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}