"use client";

import { FileDeleteDialog } from "@/components/FileDeleteDialog";
import { FilePropertiesDialog } from "@/components/FilePropertiesDialog";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Download, Info, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function FilesTable() {
  const [files, setFiles] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [showProps, setShowProps] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/files?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(
        search
      )}`
    )
      .then((res) => res.json())
      .then(({ data, total }) => {
        setFiles(data);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDownload = async (file: any) => {
    const link = document.createElement("a");
    link.href = `/api/files/${file.uuid}/download`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (file: any) => {
    setSelectedFile(file);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedFile) return;
    setLoading(true);
    await fetch(`/api/files/${selectedFile.uuid}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== selectedFile.id));
    setLoading(false);
    setShowDelete(false);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4 flex-1">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-xs"
        />
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/6" />
              <Skeleton className="h-6 w-1/6" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-8 w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>{file.name}</TableCell>
                <TableCell>{file.type || "application/octet-stream"}</TableCell>
                <TableCell>{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                <TableCell>
                  {new Date(file.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedFile(file);
                          setShowPreview(true);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="w-4 h-4 mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            `${window.location.origin}/api/files/${file.uuid}/download`
                          );
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedFile(file);
                          setShowProps(true);
                        }}
                      >
                        <Info className="w-4 h-4 mr-2" /> Properties
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(file)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!loading && files.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No files found.
        </div>
      )}
      {!loading && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={page === i + 1}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {/* File Properties Dialog */}
      <FilePropertiesDialog
        open={showProps}
        onOpenChange={setShowProps}
        file={selectedFile}
      />
      <FileDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        file={selectedFile}
        onDelete={confirmDelete}
      />
      <FilePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        file={selectedFile}
      />
    </div>
  );
}
