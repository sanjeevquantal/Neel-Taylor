import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Upload, Link, FileText, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface UploadModalProps {
  onFileSelected: (file: File) => void;
  onLinkSelected?: (url: string) => void;
  children: React.ReactNode;
  hasUploadedFile?: boolean;
}

export const UploadModal = ({ onFileSelected, onLinkSelected, children, hasUploadedFile }: UploadModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const validateFileType = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();

    // Check MIME type
    const isValidMimeType = allowedTypes.includes(file.type);

    // Check file extension as fallback
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    return isValidMimeType || hasValidExtension;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (validateFileType(file)) {
        setSelectedFile(file);
        setError('');
        // Return immediately
        onFileSelected(file);
        setIsOpen(false);
        resetModal();
      } else {
        setError('File type not supported. Please upload only PDF, DOCX, or TXT files.');
        setSelectedFile(null);
        // Clear the input
        event.target.value = '';
      }
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Pass URL and message to parent
      onLinkSelected?.(linkUrl.trim());
      setIsOpen(false);
      setLinkUrl('');
      setError('');
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to attach URL. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setLinkUrl('');
    setError('');
    setActiveTab('file');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (hasUploadedFile && open) return; // Prevent opening if file already uploaded
      setIsOpen(open);
      if (!open) resetModal();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Information</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex space-x-1 mb-4">
          <Button
            variant={activeTab === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('file');
              setError('');
            }}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            variant={activeTab === 'link' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('link');
              setError('');
            }}
            className="flex-1"
          >
            <Link className="w-4 h-4 mr-2" />
            Enter Link
          </Button>
        </div>

        {activeTab === 'file' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select Document</Label>
              {hasUploadedFile ? (
                <div className="relative">
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center opacity-50 cursor-not-allowed"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="font-medium text-muted-foreground">File already uploaded</p>
                      <p className="text-sm text-muted-foreground">
                        Only one file per conversation allowed
                      </p>
                    </div>
                  </div>
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md border shadow-md z-[100] whitespace-nowrap">
                      File upload is disabled - only one file per conversation allowed
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-primary" />
                        <p className="font-medium break-words text-center px-2">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="font-medium">Click to select file</p>
                        <p className="text-sm text-muted-foreground">
                          Supports PDF, DOCX, and TXT files
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>
            {selectedFile && !hasUploadedFile && (
              <div className="text-xs text-muted-foreground mt-1">
                File ready: <span className="font-medium">{selectedFile.name}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-input">Website URL</Label>
              <Input
                id="link-input"
                type="url"
                placeholder="https://example.com/about"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-start justify-between">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-2 text-red-400 hover:text-red-700 transition-colors shrink-0"
              aria-label="Clear error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
