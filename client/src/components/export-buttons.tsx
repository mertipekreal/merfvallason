import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type ExportFormat = "json" | "csv" | "xlsx" | "pdf";

interface ExportButtonsProps {
  datasetName: string;
  disabled?: boolean;
}

export function ExportButtons({ datasetName, disabled }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const { toast } = useToast();

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);

    try {
      const response = await fetch(
        `/api/export?name=${datasetName}&format=${format}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${datasetName}_analytics.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const formatNames: Record<ExportFormat, string> = {
        json: "JSON",
        csv: "CSV",
        xlsx: "Excel",
        pdf: "PDF"
      };

      toast({
        title: "Export successful",
        description: `Analytics exported as ${formatNames[format]}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export analytics data",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const formatItems: Array<{ format: ExportFormat; icon: typeof FileJson; label: string; description: string }> = [
    { format: "json", icon: FileJson, label: "JSON", description: "Raw data format" },
    { format: "csv", icon: FileSpreadsheet, label: "CSV", description: "Spreadsheet compatible" },
    { format: "xlsx", icon: FileSpreadsheet, label: "Excel", description: "Multi-sheet workbook" },
    { format: "pdf", icon: FileText, label: "PDF", description: "Formatted report" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || exporting !== null}
          data-testid="button-export-dropdown"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formatItems.map((item) => (
          <DropdownMenuItem
            key={item.format}
            onClick={() => handleExport(item.format)}
            disabled={exporting === item.format}
            data-testid={`button-export-${item.format}`}
          >
            <item.icon className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
