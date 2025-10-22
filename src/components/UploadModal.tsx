import { useState } from "react";
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
import { Upload, Link, FileText, X } from "lucide-react";
// No API calls here anymore; the parent will send the file with the chat request

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
        // Immediately pass file to parent and close
        onFileSelected(file);
        setIsOpen(false);
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
      // Pass URL directly to parent to be sent as multipart field `URL`
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
            onClick={() => setActiveTab('file')}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            variant={activeTab === 'link' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('link')}
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
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  disabled={hasUploadedFile}
                  className="hidden"
                />
                <label htmlFor="file-upload" className={`cursor-pointer ${hasUploadedFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {hasUploadedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="font-medium text-muted-foreground">File already uploaded</p>
                      <p className="text-sm text-muted-foreground">
                        Only one file per conversation allowed
                      </p>
                    </div>
                  ) : selectedFile ? (
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
            </div>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">{selectedFile.name} selected</div>
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
            
            <Button 
              onClick={handleLinkSubmit} 
              disabled={!linkUrl.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? 'Fetching...' : 'Fetch Content'}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
