import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Loader2 } from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  displayName: string;
  type: string;
  recordCount: number;
}

interface DatasetSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeDataset?: string;
}

export function DatasetSelector({
  value,
  onValueChange,
  placeholder = "Select dataset",
  disabled = false,
  excludeDataset,
}: DatasetSelectorProps) {
  const { data: datasetsResponse, isLoading } = useQuery<{ datasets: Dataset[] }>({
    queryKey: ["/api/datasets"],
  });

  const datasets = datasetsResponse?.datasets?.filter(d => 
    excludeDataset ? d.id !== excludeDataset : true
  ) || [];

  const groupedDatasets = datasets.reduce((acc, dataset) => {
    const type = dataset.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(dataset);
    return acc;
  }, {} as Record<string, Dataset[]>);

  const platformLabels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    spotify: "Spotify",
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
    phone: "Phone",
    other: "Other",
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full" data-testid="select-dataset">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {Object.entries(groupedDatasets).map(([type, typeDatasets]) => (
          <SelectGroup key={type}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {platformLabels[type] || type.toUpperCase()}
            </SelectLabel>
            {typeDatasets.map((dataset) => (
              <SelectItem
                key={dataset.id}
                value={dataset.id}
                data-testid={`dataset-option-${dataset.id}`}
              >
                {dataset.displayName} ({dataset.recordCount})
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
