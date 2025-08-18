import {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";

type IncompleteAttachment = Omit<CompleteAttachment, 'status'> & {
  status: {
    type: "incomplete";
    reason: "error" | "cancelled";
    error?: Error;
  };
};

/**
 * Vision-capable image adapter for GPT-4V, Claude 3, Gemini Pro Vision
 * Converts images to base64 data URLs for LLM processing
 */
export class VisionImageAdapter implements AttachmentAdapter {
  accept = "image/jpeg,image/png,image/webp,image/gif";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate file size (20MB limit for most vision models)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new Error("Afbeelding is te groot (max 20MB)");
    }

    // Return pending attachment while processing
    return {
      id: crypto.randomUUID(),
      type: "image",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    try {
      // Convert image to base64 data URL
      const base64 = await this.fileToBase64DataURL(attachment.file);

      // Return in assistant-ui format with image content
      return {
        id: attachment.id,
        type: "image",
        name: attachment.name,
        contentType: attachment.contentType,
        content: [
          {
            type: "image",
            image: base64, // data:image/jpeg;base64,... format
          },
        ],
        status: { type: "complete" },
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error("Onbekende fout bij afbeelding verwerking");
    }
  }

  async remove(_attachment: PendingAttachment): Promise<void> {
    // Cleanup if needed (e.g., revoke object URLs)
  }

  private async fileToBase64DataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // FileReader result is already a data URL
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * PDF Document adapter for document processing
 * Handles PDF files by converting to base64 for API processing
 */
export class PDFAttachmentAdapter implements AttachmentAdapter {
  accept = "application/pdf";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate file size (10MB limit for PDFs)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("PDF is te groot (max 10MB)");
    }

    return {
      id: crypto.randomUUID(),
      type: "document",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    try {
      // Convert to base64 for API processing
      const base64Data = await this.fileToBase64(attachment.file);

      return {
        id: attachment.id,
        type: "document",
        name: attachment.name,
        contentType: attachment.contentType,
        content: [
          {
            type: "text",
            text: `[PDF Document: ${attachment.name}]\nBase64 data: ${base64Data.substring(0, 50)}...`,
          },
        ],
        status: { type: "complete" },
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error("PDF verwerking mislukt");
    }
  }

  async remove(_attachment: PendingAttachment): Promise<void> {
    // Cleanup if needed
  }

  private async fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
}

/**
 * Enhanced text attachment adapter with better formatting
 */
export class EnhancedTextAttachmentAdapter implements AttachmentAdapter {
  accept = "text/plain,text/html,text/markdown,text/csv,application/json,text/javascript,text/typescript";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate file size (5MB limit for text files)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Tekstbestand is te groot (max 5MB)");
    }

    return {
      id: crypto.randomUUID(),
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    try {
      const text = await this.fileToText(attachment.file);
      const fileExtension = attachment.name.split('.').pop()?.toLowerCase() || 'txt';
      
      // Format based on file type
      let formattedText = text;
      if (['js', 'ts', 'json', 'html', 'css', 'md'].includes(fileExtension)) {
        formattedText = `\`\`\`${fileExtension}\n${text}\n\`\`\``;
      } else {
        formattedText = `<attachment name="${attachment.name}" type="${fileExtension}">\n${text}\n</attachment>`;
      }

      return {
        id: attachment.id,
        type: "file",
        name: attachment.name,
        contentType: attachment.contentType,
        content: [
          {
            type: "text",
            text: formattedText,
          },
        ],
        status: { type: "complete" },
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error("Tekstbestand verwerking mislukt");
    }
  }

  async remove(_attachment: PendingAttachment): Promise<void> {
    // Cleanup if needed
  }

  private async fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
}

/**
 * Progress-enabled attachment adapter with upload simulation
 */
export class ProgressAttachmentAdapter implements AttachmentAdapter {
  accept = "*/*";

  async *add({ file }: { file: File }): AsyncGenerator<PendingAttachment, void, any> {
    const id = crypto.randomUUID();

    // Validate file size (50MB general limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error("Bestand is te groot (max 50MB)");
    }

    // Initial pending state
    yield {
      id,
      type: "file" as const,
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running" as const, reason: "uploading" as const, progress: 0 },
    } as PendingAttachment;

    // Simulate upload progress
    for (let progress = 10; progress <= 90; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      yield {
        id,
        type: "file" as const,
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "running" as const, reason: "uploading" as const, progress },
      } as PendingAttachment;
    }

    // Final yield instead of return
    yield {
      id,
      type: "file" as const,
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running" as const, reason: "uploading" as const, progress: 100 },
    } as PendingAttachment;
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: attachment.id,
      type: attachment.type,
      name: attachment.name,
      contentType: attachment.contentType,
      content: [
        {
          type: "text",
          text: `[Bestand: ${attachment.name}]\nSuccesvol geüpload en verwerkt.`,
        },
      ],
      status: { type: "complete" },
    };
  }

  async remove(attachment: PendingAttachment): Promise<void> {
    // Cleanup logic
  }
}
